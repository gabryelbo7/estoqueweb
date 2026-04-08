# 🔄 Fluxo de Dados com Async/Await - Visualização Completa

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Fluxo de uma Requisição POST](#fluxo-de-uma-requisição-post)
3. [Fluxo de uma Requisição GET com Filtros](#fluxo-de-uma-requisição-get-com-filtros)
4. [Fluxo de Erro - O que Acontece?](#fluxo-de-erro---o-que-acontece)
5. [Timeline de Execução](#timeline-de-execução)
6. [Diagramas de Sequência](#diagramas-de-sequência)
7. [Como o database.js Habilitou Isso Tudo](#como-o-databasejs-habilitou-isso-tudo)

---

## 🏗️ Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cliente HTTP                                 │
│            (browser, cURL, Postman, aplicativo)                │
└────────────────────┬────────────────────────────────────────────┘
                     │ POST/GET/PATCH/DELETE
                     │ Request JSON
                     ▼
        ┌────────────────────────────┐
        │  Express Middleware         │
        │  (auth, logging, parsing)   │
        └────────────────┬────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Routes (productRoutes.js)         │
        │  Mapeia URL → Controller Function  │
        │  GET  /api/products  →  getAllProducts() │
        │  POST /api/products  →  createProduct() │
        │  PATCH /api/products/:id → updateProduct() │
        │  DELETE /api/products/:id → deleteProduct() │
        └────────────────────┬───────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │  ProductController.js (async functions)  │
        │                                          │
        │  1. Validações                          │
        │  2. await dbGet/dbAll/dbRun()  ← AQUI!  │
        │  3. Lógica de negócio                   │
        │  4. logAudit() (fire-and-forget)        │
        │  5. res.json() com resposta             │
        └────────────────────┬─────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │  database.js (Promisificação)            │
        │                                          │
        │  dbGet(sql, params) → Promise            │
        │  dbAll(sql, params) → Promise            │
        │  dbRun(sql, params) → Promise            │
        │  (Convertem callbacks sqlite3 em Promises) │
        └────────────────────┬─────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │  SQLite3 Driver                          │
        │  (callback-based, mas promisificado)     │
        │                                          │
        │  db.all()  \                             │
        │  db.get()   → Executa queries            │
        │  db.run()  /  (I/O blocking)             │
        │                                          │
        │  Libuv thread pool (SQLite em thread)   │
        └────────────────────┬─────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │  SQLite3 Database File (.db)            │
        │                                          │
        │  users, products, stock_movements,      │
        │  audit_logs (tabelas)                    │
        └──────────────────────────────────────────┘
           │
           └─────────┬──────────┐
                     │ resultado│
                     │  ou erro │
                     ▼
        ┌──────────────────────────────────────────┐
        │  database.js Promise resolve/reject      │
        │                                          │
        │  Promise.resolve(dados)  ← Sucesso      │
        │  Promise.reject(erro)    ← Erro         │
        └────────────────────┬─────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              Sucesso          Erro
                    │                 │
                    ▼                 ▼
        ┌──────────────────┐  ┌────────────────┐
        │ Controller (await)│  │ catch block   │
        │ recebe dados      │  │ trata erro    │
        │ res.json(data)    │  │ res.status(400/500)
        │ 200/201 OK        │  │ error: "..."  │
        └────────┬──────────┘  └────────┬───────┘
                 │                      │
                 └──────────┬───────────┘
                            │
                   Resposta JSON
                   Client ← HTTP Response
                            │
                   Browser/cURL recebe
```

---

## 📨 Fluxo de uma Requisição POST (Criar Produto)

### Passo a Passo Detalhado

```
CLIENTE ENVIA:
═══════════════════════════════════════════════════════
POST /api/products
Content-Type: application/json
Authorization: Bearer token123

{
    "name": "Monitor 27\"",
    "quantity": 5,
    "price": 1200
}

───────────────────────────────────────────────────── 1️⃣ ROUTES
Server recebe em: routes/productRoutes.js

router.post('/products', asyncHandler(createProduct));
         │                      │
         └──────────────────────┴─→ Encaminha para createProduct()
                                   com asyncHandler wrapper


───────────────────────────────────────────────────── 2️⃣ PRODUTOCONTROLLER.JS
const createProduct = async (req, res) => {
    try {
        ✅ PASSO 1: Extrair dados
        const { name, quantity, price } = req.body;
        // name = "Monitor 27\""
        // quantity = 5
        // price = 1200

        ─────────────────────────────────────────────
        ✅ PASSO 2: Validar dados (NÃO precisa await)
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ 
                error: 'Nome é obrigatório...',
                code: 'INVALID_NAME'
            });
        }
        // PASSOU ✓ (name = "Monitor 27\"")

        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ ... });
        }
        // PASSOU ✓ (quantity = 5)

        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ ... });
        }
        // PASSOU ✓ (price = 1200)

        ─────────────────────────────────────────────
        ✅ PASSO 3: Verificar duplicata no banco
        
        // ⏳ AWAIT #1 - Chamada ao banco de dados
        const existingProduct = await dbGet(
            'SELECT id FROM products WHERE name = ?',
            ["Monitor 27\""]
        );
        
        // Node.js PAUSA esta função
        // Continua processando outras requisições
        // Libuv executa SQLite em thread separada
        
        // ... espera ~10-50ms ...
        
        // SQLite retorna resultado
        if (existingProduct) {
            // Se encontrou, é duplicata
            return res.status(409).json({
                error: 'Já existe um produto com este nome.',
                code: 'PRODUCT_ALREADY_EXISTS'
            });
        }
        // PASSOU ✓ (não encontrou duplicata)

        ─────────────────────────────────────────────
        ✅ PASSO 4: Inserir novo produto
        
        // ⏳ AWAIT #2 - INSERT no banco
        const insertResult = await dbRun(
            'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
            ["Monitor 27\"", 5, 1200]
        );
        
        // Resultado contém:
        // insertResult.lastID = 42  (ID do novo produto)
        // insertResult.changes = 1   (1 linha inserida)
        
        const productId = insertResult.lastID;  // 42

        ─────────────────────────────────────────────
        ✅ PASSO 5: Registrar movimentação de estoque
        
        if (quantity > 0) {  // 5 > 0 ✓
            // ⏳ AWAIT #3 - INSERT movimentação
            await dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [42, 'IN', 5]
            );
        }

        ─────────────────────────────────────────────
        ✅ PASSO 6: Registrar log de auditoria
        
        // ⚡ NÃO tem AWAIT - Fire-and-forget!
        logAudit(
            req.user.id,        // 1 (ID do usuário logado)
            'CREATE',           // Tipo de ação
            'products',         // Tabela afetada
            42,                 // ID do produto criado
            null,               // Valores antigos (null pra CREATE)
            { 
                name: "Monitor 27\"",
                quantity: 5,
                price: 1200
            }  // Valores novos
        );
        
        // ⚠️ Esta função dispara em background!
        // Node.js NÃO aguarda ela terminar
        // Responde ao cliente IMEDIATAMENTE
        // Log é salvo alguns ms depois

        ─────────────────────────────────────────────
        ✅ PASSO 7: Responder ao cliente
        
        res.status(201).json({  // 201 = CREATED
            success: true,
            message: 'Produto adicionado com sucesso',
            data: {
                id: 42,
                name: "Monitor 27\"",
                quantity: 5,
                price: 1200
            }
        });
        
    } catch (err) {
        // Se qualquer AWAIT falhar, cai aqui
        // Ex: dbRun() lança erro (disco cheio, permissão negada)
        
        console.error('❌ Erro ao criar produto:', err.message);
        
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'CREATE_PRODUCT_ERROR'
        });
    }
};


───────────────────────────────────────────────────── 3️⃣ DATABASE.JS
// Quando controller chama: await dbRun(...)
// database.js converte do SQLite callback para Promise

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);  // Propaga erro
            } else {
                resolve({
                    lastID: this.lastID,  // ID do INSERT
                    changes: this.changes  // Linhas afetadas
                });
            }
        });
    });
};

// ✅ Transforma callback em Promise!


───────────────────────────────────────────────────── 4️⃣ SQLITE3 CALLBACK
// SQLite chama o callback quando terminar

db.run(sql, params, function(err) {
    if (err) {
        // Erro: disco cheio, permissão negada, constraint violada
        // dbRun() rejeita a Promise
    } else {
        // Sucesso: linha inserida
        // dbRun() resolve a Promise
    }
});


─────────────────────────────────────────────────────– 5️⃣ RESPOSTA AO CLIENTE
HTTP/1.1 201 Created
Content-Type: application/json

{
    "success": true,
    "message": "Produto adicionado com sucesso",
    "data": {
        "id": 42,
        "name": "Monitor 27\"",
        "quantity": 5,
        "price": 1200
    }
}

CLIENTE RECEBE RESPOSTA ✓

═══════════════════════════════════════════════════════
TEMPO TOTAL: ~150ms (sem timeout, blazing fast!)
```

---

## 🔍 Fluxo de uma Requisição GET com Filtros

```
CLIENTE ENVIA:
═══════════════════════════════════════════════════════
GET /api/products?search=monitor&lowStock=true
Authorization: Bearer token123

───────────────────────────────────────────────────── 1️⃣ PRODUTOCONTROLLER
const getAllProducts = async (req, res) => {
    try {
        ✅ PASSO 1: Extrair filtros
        const { search, lowStock } = req.query;
        // search = "monitor"
        // lowStock = "true"

        ─────────────────────────────────────────────
        ✅ PASSO 2: Construir SQL dinamicamente
        
        let sql = 'SELECT * FROM products';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('name LIKE ?');
            params.push(`%monitor%`);
            // SQL será: ... WHERE name LIKE '%monitor%' AND ...
        }

        if (lowStock === 'true') {
            conditions.push('quantity < 5');
            // Sem parametro (já é uma condição estática)
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        // SQL FINAL: "SELECT * FROM products WHERE name LIKE ? AND quantity < 5"

        sql += ' ORDER BY id DESC';

        ─────────────────────────────────────────────
        ✅ PASSO 3: Executar query no banco
        
        // ⏳ AWAIT - Buscar dados
        const rows = await dbAll(sql, [`%monitor%`]);
        
        // Resultado (exemplo):
        // rows = [
        //     { id: 42, name: "Monitor 27\"", quantity: 2, price: 1200 },
        //     { id: 5, name: "Monitor 24\"", quantity: 0, price: 800 }
        // ]

        ─────────────────────────────────────────────
        ✅ PASSO 4: Responder ao cliente
        
        res.json({
            success: true,
            data: rows,
            count: rows.length  // 2 produtos encontrados
        });
        
    } catch (err) {
        console.error('❌ Erro ao listar produtos:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'FETCH_PRODUCTS_ERROR'
        });
    }
};

─────────────────────────────────────────────────────– 5️⃣ RESPOSTA
HTTP/1.1 200 OK
Content-Type: application/json

{
    "success": true,
    "data": [
        {
            "id": 42,
            "name": "Monitor 27\"",
            "quantity": 2,
            "price": 1200
        },
        {
            "id": 5,
            "name": "Monitor 24\"",
            "quantity": 0,
            "price": 800
        }
    ],
    "count": 2
}

═══════════════════════════════════════════════════════
```

---

## ⚠️ Fluxo de Erro - O que Acontece?

### Cenário 1: Validação Falha

```
CLIENTE ENVIA:
─────────────────────────────────────────────────────
POST /api/products
Content-Type: application/json

{
    "name": "Monitor",
    "quantity": "dez",  // ❌ String, não número!
    "price": 1200
}

───────────────────────────────────────────────────── CONTROLLER
const createProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        // quantity = "dez" (string, não number)

        if (typeof quantity !== 'number' || quantity < 0) {
            // ✅ Validação FALHOU!
            return res.status(400).json({
                success: false,
                error: 'Quantidade deve ser um número maior ou igual a 0.',
                code: 'INVALID_QUANTITY'
            });
        }
        
        // ✅ Function retorna aqui
        // Nunca chega em nenhum await
        // Nenhuma operação no banco é feita
        
    } catch (err) {
        // ❌ Não cai no catch (não foi erro, foi return)
    }
};

───────────────────────────────────────────────────── RESPOSTA
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
    "success": false,
    "error": "Quantidade deve ser um número maior ou igual a 0.",
    "code": "INVALID_QUANTITY"
}

═══════════════════════════════════════════════════════
✅ VANTAGEM: Falha rápido ANTES de operação no banco
```

### Cenário 2: Erro no Banco (Capturado pelo try/catch)

```
CLIENTE ENVIA:
─────────────────────────────────────────────────────
POST /api/products
Content-Type: application/json

{
    "name": "Monitor",
    "quantity": 10,
    "price": 1200
}

───────────────────────────────────────────────────── CONTROLLER
const createProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        
        // Validações PASSAM ✓
        
        const existingProduct = await dbGet(...);  // ✓ Sucesso
        
        // ⏳ AWAIT #2 - Inserir produto
        const insertResult = await dbRun(
            'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
            ["Monitor", 10, 1200]
        );
        
        // ❌ ERRO!
        // Motivo possível: Disco cheio, permissão negada, SQLite corrompido
        // dbRun() rejeita a Promise
        // throw Error('disk I/O error')

        // JavaScript PULA para o catch block
        // Resto do código é IGNORADO

    } catch (err) {
        // ✅ CAPTUROU o erro!
        console.error('❌ Erro ao criar produto:', err.message);
        
        res.status(500).json({
            success: false,
            error: err.message,  // "disk I/O error"
            code: 'CREATE_PRODUCT_ERROR'
        });
    }
};

───────────────────────────────────────────────────── RESPOSTA
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
    "success": false,
    "error": "disk I/O error",
    "code": "CREATE_PRODUCT_ERROR"
}

═══════════════════════════════════════════════════════
✅ VANTAGEM: Erro é capturado e tratado graciosamente
```

### Cenário 3: Duplicata Detectada

```
BASE DE DADOS JÁ CONTÉM:
─────────────────────────────────────────────────────
products table:
id  | name      | quantity | price
────┼───────────┼──────────┼───────
1   | Monitor   | 10       | 1200
2   | Teclado   | 5        | 200

CLIENTE TENTA CRIAR:
─────────────────────────────────────────────────────
POST /api/products

{
    "name": "Monitor",  // ❌ Já existe!
    "quantity": 20,
    "price": 1500
}

───────────────────────────────────────────────────── CONTROLLER
const createProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        
        // Validações PASSAM ✓
        
        // ⏳ AWAIT #1 - Verificar duplicata
        const existingProduct = await dbGet(
            'SELECT id FROM products WHERE name = ?',
            ["Monitor"]
        );
        
        // SQLite retorna: { id: 1 }
        
        if (existingProduct) {
            // ✅ PRODUTO JÁ EXISTE!
            return res.status(409).json({
                success: false,
                error: 'Já existe um produto com este nome.',
                code: 'PRODUCT_ALREADY_EXISTS'
            });
        }
        
        // Resto do código é IGNORADO
        
    } catch (err) {
        // Não cai aqui (não foi erro, foi return)
    }
};

───────────────────────────────────────────────────── RESPOSTA
HTTP/1.1 409 Conflict
Content-Type: application/json

{
    "success": false,
    "error": "Já existe um produto com este nome.",
    "code": "PRODUCT_ALREADY_EXISTS"
}

═══════════════════════════════════════════════════════
✅ VANTAGEM: Duplicata é detectada ANTES de inserir
```

---

## ⏱️ Timeline de Execução

### Requisição: CREATE PRODUTO + MOVIMENTAÇÃO + AUDITORIA

```
Tempo em ms:

0ms    ┌─ POST /api/products chega
       │
10ms   │  [VALIDAÇÕES - super rápido, CPU-bound]
       │  • Verificar tipos
       │  • Validar tamanhos
       │
15ms   │  ⏳ await dbGet() - Verificar duplicata
       │  └─ Libuv thread pool pega
       │     SQLite executa: SELECT id FROM products WHERE name = ?
       │     (Aguardando E/S disco)
       │
75ms   ├─ SQLite retorna resultado
       │  (Levou ~60ms para disco responder)
       │
76ms   │  ⏳ await dbRun() - INSERT produto
       │  └─ Libuv thread pool pega
       │     SQLite executa: INSERT INTO products ...
       │     Aguardando E/S disco
       │
120ms  ├─ SQLite confirma INSERT
       │  lastID = 42
       │
121ms  │  ⏳ await dbRun() - INSERT movimentação
       │  └─ Libuv thread pool pega
       │     SQLite executa: INSERT INTO stock_movements ...
       │
155ms  ├─ SQLite confirma INSERT
       │
156ms  │  🔥 logAudit() - SEM AWAIT
       │  └─ Apenas dispara a função
       │     Node.js continua imediatamente
       │     Log será salvo em background (não bloqueia!)
       │
157ms  │  res.json() - Responder ao CLIENTE
       │  └─ Enviando HTTP 201 Created
       │     ✅ CLIENTE RECEBE RESPOSTA
       │
158ms  │  [Enquanto isso, logAudit() continua em background]
       │
200ms  │  ⏳ logAudit() já salvou o log no banco
       │  └─ Transparente pro cliente
       │
       └─ FIM

═════════════════════════════════════════════════════════

TOTAL TIME TO CLIENT: ~157ms ✅ (muito rápido!)
Sem await em logAudit, economia de ~50ms por requisição

Se tivesse usado "await logAudit(...)":
TOTAL TIME: ~207ms (50ms mais lento!)
```

---

## 📊 Diagramas de Sequência

### Fluxo Sucesso - POST /api/products

```
Cliente          Routes        Controller       Database.js      SQLite
   │                │               │                │              │
   ├─── POST ──────→│               │                │              │
   │    {data}      │               │                │              │
   │                ├──────────────→│                │              │
   │                │   req, res    │                │              │
   │                │               │ VALIDAÇÕES     │              │
   │                │               │ (instant)      │              │
   │                │               │                │              │
   │                │               ├────────────────│→ dbGet       │
   │                │               │await           │ (SELECT)    │
   │                │               │                │   ↓         │
   │                │               │                │ Executa...  │
   │                │               │                │   ↓         │
   │                │               │   {:result}────│←─ callback  │
   │                │               │                │              │
   │                │               ├────────────────│→ dbRun      │
   │                │               │await           │ (INSERT)    │
   │                │               │                │   ↓         │
   │                │               │                │ Executa...  │
   │                │               │ {:id}──────────│←─ callback  │
   │                │               │                │              │
   │                │               ├────────────────│→ dbRun      │
   │                │               │await           │ (INSERT mov)│
   │                │               │                │   ↓         │
   │                │               │   {:ok}────────│←─ callback  │
   │                │               │                │              │
   │                │               │ logAudit()     │              │
   │                │               │ (sem await!)   │              │
   │                │               │                │              │
   │                │               │res.status(201) │              │
   │  ← HTTP 201 ───│←──────────────│.json()         │              │
   │    {success}   │               │ (imediato!)    │              │
   │                │               │                │              │
   │ (alguns ms depois, ainda em background):       │              │
   │                │               │ logAudit       │              │
   │                │               │ aguardando     │              │
   │                │               │    ↓          ├→ dbRun      │
   │                │               │                │ (INSERT log)│
   │                │               │                │    ↓        │
   │                │               │                │ Executa ... │
   │                │               │                │    ↓        │
   │                │               │                │    {:ok}←───│
```

---

## 🔧 Como o database.js Habilitou Isso Tudo

### O Problema Original (SQLite com Callbacks)

```javascript
// ❌ SQLite usa callbacks, não Promises
db.all(sql, params, (err, rows) => {
    if (err) throw err;
    // rows está aqui
});

// rows não está aqui! (ainda não retornou)
console.log(rows);  // undefined!

// ❌ Não pode usar em async/await
const rows = await db.all(sql, params);  // ❌ ERRO: db.all não retorna Promise
```

### A Solução: Promisificação em database.js

```javascript
// ✅ database.js converte callbacks em Promises

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);      // Se erro, rejeita Promise
            } else {
                resolve(rows);    // Se sucesso, resolve com dados
            }
        });
    });
};

// ✅ Agora funciona com await!
const rows = await dbAll(sql, params);  // ✅ Funciona!
console.log(rows);  // Array de resultados
```

### Três Funções de Promisificação

```javascript
// 1️⃣ dbGet - Retorna UMA linha
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);  // row ou undefined
        });
    });
};

// Uso:
const user = await dbGet('SELECT * FROM users WHERE id = ?', [1]);
// user = { id: 1, name: "Admin", ... } ou undefined

─────────────────────────────────────────────────────

// 2️⃣ dbAll - Retorna MÚLTIPLAS linhas
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);  // Array []
        });
    });
};

// Uso:
const products = await dbAll('SELECT * FROM products');
// products = [ {id: 1, name: "Monitor", ...}, {id: 2, ...}, ... ]

─────────────────────────────────────────────────────

// 3️⃣ dbRun - Executa INSERT/UPDATE/DELETE
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {  // function() para ter 'this'
            if (err) reject(err);
            else resolve({
                lastID: this.lastID,    // ID do INSERT
                changes: this.changes   // Linhas afetadas
            });
        });
    });
};

// Uso:
const result = await dbRun('INSERT INTO products VALUES (?, ?, ?)', [...]);
// result = { lastID: 42, changes: 1 }
```

### Resultado: Controller Limpo!

```javascript
// ✅ Graças à promisificação, controller fica LIMPO:

const createProduct = async (req, res) => {
    try {
        // Sem callbacks! Puro async/await!
        const existing = await dbGet(...);
        if (existing) return res.status(409).json(...);
        
        const result = await dbRun(...);
        
        if (quantity > 0) {
            await dbRun(...);
        }
        
        logAudit(...);  // Fire-and-forget
        res.status(201).json({ success: true, data: result });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Linear, limpo, legível!
// ✅ Nenhum callback visível!
// ✅ Tratamento de erro centralizado!
```

---

## 🎯 Conclusão: A Magia por Trás

| Camada | Padrão | Benefício |
|--------|--------|-----------|
| **SQLite Driver** | Callback-based | Nativo, mas difícil |
| **database.js** | Promisificação | Converte em Promise |
| **Controller** | Async/Await | Super limpo e linear |
| **Routes** | asyncHandler | Captura erros automaticamente |
| **Express** | Middleware | Responde ao cliente |

```
SQLite callbacks (confuso)
        ↓ (promisificação em database.js)
Promises (melhor)
        ↓ (async/await em controller)
Código linear (perfeito!)
        ↓ (asyncHandler em routes)
Tratamento centralizado de erros
        ↓ (middleware em server.js)
Cliente recebe resposta JSON clara
```

**Resultado:** 🚀 **Código profissional, maintível, e escalável!**

