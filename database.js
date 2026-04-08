const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Cria o arquivo do banco de dados dentro da pasta src (ou raiz se preferir)
const dbPath = path.resolve(__dirname, 'estoque.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

/**
 * Retorna uma função que promissifica um método do sqlite3 Database.
 * @param {'get'|'all'|'run'} method
 * @returns {(sql: string, params?: any[]) => Promise<any>}
 */
const promisifyDbMethod = (method) => {
    return (sql, params = []) => {
        return new Promise((resolve, reject) => {
            const callback = function (err, result) {
                if (err) {
                    return reject(err);
                }

                if (method === 'run') {
                    return resolve({ lastID: this.lastID, changes: this.changes });
                }

                return resolve(result);
            };

            db[method](sql, params, callback);
        });
    };
};

const dbRun = promisifyDbMethod('run');
const dbGet = promisifyDbMethod('get');
const dbAll = promisifyDbMethod('all');

/**
 * Inicializa o banco de dados criando tabelas padrão
 */
const initializeDatabase = async () => {
    try {
        // Criar tabela de produtos
        await dbRun(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
            price REAL NOT NULL DEFAULT 0.0 CHECK(price > 0),
            store_id INTEGER NOT NULL DEFAULT 1
        )`);
        console.log('✓ Tabela products criada/verificada');

        // Adicionar coluna store_id se não existir (migração)
        try {
            await dbRun(`ALTER TABLE products ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1`);
            console.log('✓ Coluna store_id adicionada à tabela products');
        } catch (err) {
            // Coluna já existe, ignorar erro
            if (!err.message.includes('duplicate column name')) {
                console.log('✓ Coluna store_id já existe em products');
            }
        }

        // Criar tabela de auditoria
        await dbRun(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
        console.log('✓ Tabela audit_logs criada/verificada');

        // Criar tabela de movimentações de estoque
        await dbRun(`CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
            quantity INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);
        console.log('✓ Tabela stock_movements criada/verificada');

        // Criar tabela de usuários (preserva dados em reinicializações)
        await dbRun(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin', 'employee')),
            store_id INTEGER NOT NULL DEFAULT 1
        )`);
        console.log('✓ Tabela users criada/verificada');

        // Adicionar coluna store_id se não existir (migração)
        try {
            await dbRun(`ALTER TABLE users ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1`);
            console.log('✓ Coluna store_id adicionada à tabela users');
        } catch (err) {
            // Coluna já existe, ignorar erro
            if (!err.message.includes('duplicate column name')) {
                console.log('✓ Coluna store_id já existe em users');
            }
        }

        // Inserir usuários padrão com bcrypt assíncrono
        const adminPassword = await bcrypt.hash('admin123', 10);
        const employeePassword = await bcrypt.hash('func123', 10);

        await dbRun(
            `INSERT INTO users (username, password, role, store_id) VALUES ('admin', ?, 'admin', 1)`,
            [adminPassword]
        ).catch(() => {
            console.log('✓ Usuário admin já existe');
        });
        console.log('✓ Usuário admin criado: admin / admin123 (admin, store_id: 1)');

        await dbRun(
            `INSERT INTO users (username, password, role, store_id) VALUES ('funcionario', ?, 'employee', 1)`,
            [employeePassword]
        ).catch(() => {
            console.log('✓ Usuário funcionário já existe');
        });
        console.log('✓ Usuário funcionário criado: funcionario / func123 (employee, store_id: 1)');

    } catch (err) {
        console.error('Erro ao inicializar banco de dados:', err.message);
    }
};

// Inicializar banco de dados quando conectar
db.once('open', () => {
    initializeDatabase();
});

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll
};