# 📚 BOAS PRÁTICAS - GUIA DE MANUTENÇÃO E DESENVOLVIMENTO

## 🎯 Princípios Implementados

Este guia documenta os padrões profissionais agora em uso no projeto.

---

## 1️⃣ ASYNC/AWAIT - Padrão de Código

### ✅ FAZER (Recomendado)

```javascript
// Controllers - sempre async/await
const myController = async (req, res) => {
    try {
        const data = await dbGet(sql, params);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Rotas - utilizar asyncHandler
router.get('/path', asyncHandler(myController));

// Promises paralelas - usar Promise.all
const [result1, result2, result3] = await Promise.all([
    dbGet(sql1, []),
    dbGet(sql2, []),
    dbAll(sql3, [])
]);
```

### ❌ NÃO FAZER (Evitar)

```javascript
// Nem callbacks simples
db.get(sql, [], (err, row) => {
    // ...
});

// Nem Promise sem await
dbGet(sql, []).then(row => {
    // ...
});

// Nem Promise sem catch
await dbGet(sql, []); // Sem try/catch = crash!
```

---

## 2️⃣ ESTRUTURA DE RESPOSTA API

### Resposta de Sucesso
```javascript
{
    "success": true,
    "message": "Descrição breve da ação",  // Adicional, em criações
    "data": {
        // Dados retornados
    },
    "count": 5,  // Quando retorna array
    "timestamp": "2024-04-07T10:30:00.000Z"  // Em dashboards
}
```

### Resposta de Erro
```javascript
{
    "success": false,
    "error": "Descrição entendível para o usuário",
    "code": "ERRO_PADRONIZADO",  // Para cliente tratar específico
    "timestamp": "2024-04-07T10:30:00.000Z"  // Rastreamento
}
```

### Códigos de Status HTTP
| Código | Uso | Exemplo |
|--------|-----|---------|
| 200 | Sucesso geral | GET /products |
| 201 | Criado com sucesso | POST /products |
| 400 | Erro de validação | name vazio |
| 401 | Sem autenticação | token ausente |
| 403 | Sem autorização | employee criando |
| 404 | Recurso não encontrado | product id=999 |
| 409 | Conflito/Duplicação | produto com mesmo nome |
| 500 | Erro interno | exceção não tratada |

---

## 3️⃣ TRATAMENTO DE ERROS

### Padrão de Try/Catch

```javascript
const myController = async (req, res) => {
    try {
        // Validação de entrada
        if (!req.body.name) {
            return res.status(400).json({
                success: false,
                error: 'Nome é obrigatório',
                code: 'MISSING_NAME'
            });
        }

        // Operação principal
        const result = await dbRun(sql, [req.body.name]);

        // Resposta de sucesso
        res.status(201).json({
            success: true,
            message: 'Criado com sucesso',
            data: result
        });

    } catch (err) {
        // Logging
        console.error('❌ Erro ao criar:', err.message);

        // Diferenciação de erro
        if (err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({
                success: false,
                error: 'Já existe esse nome',
                code: 'DUPLICATE_NAME'
            });
        }

        // Erro genérico
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'CREATE_ERROR'
        });
    }
};
```

### Usando asyncHandler
```javascript
// Não precisa de try/catch externo se usar asyncHandler
router.post('/', asyncHandler(async (req, res) => {
    // Código aqui
    // Qualquer erro é passado para globalErrorHandler
}));
```

---

## 4️⃣ BANCO DE DADOS - Padrão de Uso

### Criar função para operação comum

```javascript
// ❌ Evitar: duplicar SQL em múltiplos lugares
const getAllProducts = async (req, res) => {
    const rows = await dbAll('SELECT * FROM products ORDER BY id DESC');
};

const getProductsLowStock = async (req, res) => {
    const rows = await dbAll('SELECT * FROM products WHERE quantity < 5');
};

// ✅ Fazer: encapsular lógica em função reutilizável
const productService = {
    getAll: async () => {
        return await dbAll('SELECT * FROM products ORDER BY id DESC');
    },
    
    getLowStock: async () => {
        return await dbAll('SELECT * FROM products WHERE quantity < 5');
    }
};

// Usar em múltiplos controllers
const allProducts = await productService.getAll();
```

### Usar transações para operações relacionadas

```javascript
// ❌ Evitar: operações independentes
await dbRun('INSERT INTO products ...', params1);
await dbRun('INSERT INTO stock_movements ...', params2); // Pode falhar!

// ✅ Fazer: agrupar operações relacionadas
try {
    const result = await dbRun('INSERT INTO products ...', params1);
    await dbRun(
        'INSERT INTO stock_movements ...',
        [result.lastID, 'IN', quantity]
    );
} catch (err) {
    // Se falhar, a transação é revertida
    throw err;
}
```

### Prepared Statements (já feito)

```javascript
// ✅ CORRETO: SQL com placeholders
const row = await dbGet('SELECT * FROM products WHERE id = ?', [id]);

// ❌ ERRADO: Concatenação de strings (SQL injection!)
const row = await dbGet(`SELECT * FROM products WHERE id = ${id}`);
```

---

## 5️⃣ AUTENTICAÇÃO E AUTORIZAÇÃO

### Middleware de Autenticação
```javascript
// middleware/auth.js
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Token não fornecido',
            code: 'NO_TOKEN'
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }
        
        req.user = user;
        next();
    });
};
```

### Proteção de Rotas

```javascript
// ✅ CORRETO: Rotas com proteção apropriada

// Público
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

// Autenticado (todos logados)
router.get('/products', authenticateToken, productController.getAllProducts);

// Admin apenas
router.post('/products', authenticateToken, requireAdmin, productController.createProduct);
router.delete('/products/:id', authenticateToken, requireAdmin, productController.deleteProduct);

// Employee ou Admin
router.get('/dashboard', authenticateToken, requireEmployee, dashboardController.getDashboard);
```

---

## 6️⃣ LOGGING E AUDITORIA

### Logging de Aplicação

```javascript
// Mensagens importantes
console.log('✓ Servidor iniciado em port 3000');
console.log('✓ Conectado ao banco de dados');

// Avisos (cuidado!)
console.warn('⚠️ JWT_SECRET não definido, usando padrão');

// Erros (deve rastrear)
console.error('❌ Erro ao criar produto:', err.message);

// Debug (opcional, remover em produção)
console.debug('🔍 Query executada:', sql);
```

### Auditoria de Dados

```javascript
// Registrar TODA mudança de dados críticos
const logAudit = async (userId, action, tableName, recordId, oldValues = null, newValues = null) => {
    try {
        const sql = `
            INSERT INTO audit_logs 
            (user_id, action, table_name, record_id, old_values, new_values) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await dbRun(sql, [
            userId,
            action,  // CREATE, UPDATE, DELETE
            tableName,
            recordId,
            JSON.stringify(oldValues),  // Para saber o que era antes
            JSON.stringify(newValues)   // Para saber o que ficou depois
        ]);
    } catch (err) {
        console.error('❌ Erro ao registrar auditoria:', err.message);
        // NÃO rejeitar promise - não bloquear operação principal
    }
};

// Usar em operações críticas
await logAudit(req.user.id, 'UPDATE', 'products', productId, oldData, newData);
```

---

## 7️⃣ PERFORMANCE

### Otimizações Já Implementadas

✅ **Promise.all** para queries paralelas
```javascript
const [result1, result2, result3] = await Promise.all([...]);
```

✅ **Bcrypt assíncrono** não bloqueia event loop
```javascript
const isValid = await bcrypt.compare(password, hash);
```

✅ **Fire-and-forget** para logging não-crítico
```javascript
logAudit(...).catch(() => {}); // Não aguarda
```

### Otimizações Recomendadas

❌ **Evitar N+1 queries**
```javascript
// Evitar isso:
const products = await dbAll('SELECT * FROM products');
for (const product of products) {
    const movements = await dbAll('SELECT * FROM stock_movements WHERE product_id = ?', [product.id]);
    // Uma query por produto = N+1!
}

// Fazer isso:
const movements = await dbAll('SELECT * FROM stock_movements');
// Agrupar em memória
```

❌ **Evitar cálculos repetidos**
```javascript
// Melhor usar índices no banco
const rows = await dbAll('SELECT * FROM products'); // Todos
const lowStock = rows.filter(r => r.quantity < 5);

// Em vez de:
const lowStock = await dbAll('SELECT * FROM products WHERE quantity < 5'); // Sem índice = scan todo
```

---

## 8️⃣ TESTES

### Estrutura de Teste (Recomendado)

```bash
npm install --save-dev jest supertest
```

```javascript
// tests/products.test.js
const request = require('supertest');
const app = require('../server');

describe('Produtos API', () => {
    let token;
    
    beforeAll(async () => {
        // Login e salvar token
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' });
        token = res.body.token;
    });
    
    test('GET /api/products deve retornar lista', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    test('POST /api/products sem admin deve retornar 403', async () => {
        // Login com employee
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({ name: 'Test', quantity: 10, price: 99.99 });
        
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });
});
```

---

## 9️⃣ VARIÁVEIS DE AMBIENTE

### Configurar .env

```bash
# .env (nunca commitar!)
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_senha_super_secreta_aqui_minimo_32_caracteres
DATABASE_PATH=./estoque.db
```

### Usar em código

```javascript
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_em_desenvolvimento';
```

---

## 🔟 DEPLOYMENT

### Checklist Antes de Produção

- [ ] `NODE_ENV=production` definido
- [ ] `JWT_SECRET` com valor forte (32+ caracteres)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Variáveis sensíveis em `.env`
- [ ] Testes executados com sucesso
- [ ] Logs com informações sem dados sensíveis
- [ ] SSL/HTTPS ativado
- [ ] Backup do banco de dados automatizado
- [ ] Monitoramento de erros (Sentry, etc.)

---

## 1️⃣1️⃣ ESTRUTURA DE PASTAS RECOMENDADA

```
projeto/
├── controllers/           # Lógica de negócio
│   ├── authController.js
│   ├── productController.js
│   └── dashboardController.js
├── routes/               # Definição de rotas
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── dashboardRoutes.js
├── middleware/           # Middlewares Express
│   ├── auth.js
│   ├── errorHandler.js
│   └── logger.js         # Adicionar
├── services/             # Lógica reutilizável (adicionar)
│   ├── productService.js
│   └── authService.js
├── models/              # Schemas de dados (adicionar)
│   ├── Product.js
│   └── User.js
├── tests/               # Testes automatizados (adicionar)
│   ├── products.test.js
│   ├── auth.test.js
│   └── dashboard.test.js
├── database.js          # Conexão e helpers
├── server.js            # Configuração Express
├── .env                 # Variáveis de ambiente (git ignore)
├── .env.example         # Exemplo de .env
├── .gitignore          # Arquivo ignore
├── package.json        # Dependências
└── README.md           # Documentação
```

---

## 1️⃣2️⃣ CHECKLIST FINAL

### Code Quality
- [ ] Sem console.log em produção
- [ ] Todas as funções async têm try/catch
- [ ] Sem callback hell
- [ ] Sem duplicação de código
- [ ] Nomes de variáveis descritivos

### Security
- [ ] Sem senhas hardcoded
- [ ] SQL injection prevenido
- [ ] Validação de entrada rigorosa
- [ ] Autorização checada em cada rota
- [ ] Bcrypt com 10+ salt rounds

### Performance
- [ ] Promise.all para queries paralelas
- [ ] Sem N+1 queries
- [ ] Índices no banco de dados
- [ ] Cache implementado (se necessário)
- [ ] Sem operações bloqueantes

### Maintenance
- [ ] Código documentado (JSDoc)
- [ ] Testes automatizados
- [ ] Logs informativos
- [ ] Auditoria de mudanças
- [ ] README.md atualizado

---

**Última atualização:** 2024-04-07  
**Versão:** 1.0.0  
**Status:** ✅ PRONTO PARA SEGUIR
