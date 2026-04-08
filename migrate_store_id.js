// Script de migração para adicionar store_id aos usuários existentes
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'estoque.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Iniciando migração de store_id para usuários existentes...');

db.serialize(() => {
    // Verificar se a coluna store_id existe na tabela users
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('❌ Erro ao verificar estrutura da tabela:', err);
            return;
        }

        const hasStoreId = columns.some(col => col.name === 'store_id');

        if (!hasStoreId) {
            console.log('❌ Coluna store_id não existe. Execute o servidor primeiro para criar as tabelas.');
            db.close();
            return;
        }

        // Atualizar usuários existentes que não têm store_id
        db.run(
            "UPDATE users SET store_id = 1 WHERE store_id IS NULL OR store_id = 0",
            function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar usuários:', err);
                } else {
                    console.log(`✅ ${this.changes} usuários atualizados com store_id = 1`);
                }

                // Verificar usuários após atualização
                db.all("SELECT id, username, role, store_id FROM users", (err, rows) => {
                    if (err) {
                        console.error('❌ Erro ao verificar usuários:', err);
                    } else {
                        console.log('👥 Usuários no sistema:');
                        rows.forEach(user => {
                            console.log(`  - ${user.username} (ID: ${user.id}, Role: ${user.role}, Store: ${user.store_id})`);
                        });
                    }

                    db.close();
                    console.log('✅ Migração concluída!');
                });
            }
        );
    });
});