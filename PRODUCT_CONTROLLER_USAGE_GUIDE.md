# 🛠️ Guia Prático - ProductController com Async/Await

## Índice Rápido

1. [Visão Geral](#visão-geral)
2. [Exemplos de Uso](#exemplos-de-uso)
3. [Tratamento de Erros](#tratamento-de-erros)
4. [Testes com cURL](#testes-com-curl)
5. [Padrões Aplicados](#padrões-aplicados)
6. [FAQ](#faq)

---

## 🎯 Visão Geral

O `productController.js` implementa 4 funções principais, todas com **async/await**:

| Função | Método HTTP | Descrição | Status Codes |
|--------|-------------|-----------|-------------|
| `getAllProducts` | GET | Lista produtos com filtros | 200, 500 |
| `createProduct` | POST | Cria novo produto | 201, 400, 409, 500 |
| `updateProduct` | PATCH | Atualiza quantidade | 200, 400, 404, 500 |
| `deleteProduct` | DELETE | Remove produto | 200, 404, 500 |

---

## 💻 Exemplos de Uso

### 1. **getAllProducts - Listar Produtos**

#### Função Atual (Async/Await)
```javascript
const getAllProducts = async (req, res) => {
    try {
        const { search, lowStock } = req.query;
        let sql = 'SELECT * FROM products';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('name LIKE ?');
            params.push(`%${search}%`);
        }

        if (lowStock === 'true') {
            conditions.push('quantity < 5');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY id DESC';

        const rows = await dbAll(sql, params);
        
        res.json({ 
            success: true, 
            data: rows,
            count: rows.length 
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
```

#### Exemplos de Chamadas

##### Exemplo 1: Listar todos os produtos
```javascript
// Requisição
GET /api/products

// Resposta (200 OK)
{
    "success": true,
    "data": [
        { "id": 1, "name": "Notebook", "quantity": 5, "price": 2500 },
        { "id": 2, "name": "Mouse", "quantity": 20, "price": 30 },
        { "id": 3, "name": "Teclado", "quantity": 0, "price": 150 }
    ],
    "count": 3
}
```

##### Exemplo 2: Buscar por nome
```javascript
// Requisição
GET /api/products?search=mouse

// Resposta (200 OK)
{
    "success": true,
    "data": [
        { "id": 2, "name": "Mouse", "quantity": 20, "price": 30 }
    ],
    "count": 1
}
```

##### Exemplo 3: Listar produtos com estoque baixo
```javascript
// Requisição
GET /api/products?lowStock=true

// Resposta (200 OK)
{
    "success": true,
    "data": [
        { "id": 1, "name": "Notebook", "quantity": 5, "price": 2500 },
        { "id": 3, "name": "Teclado", "quantity": 0, "price": 150 }
    ],
    "count": 2
}
```

##### ❌ Erro: Falha no banco de dados
```javascript
// Se dbAll() falhar (ex: banco offline)
// Resposta (500 Internal Server Error)
{
    "success": false,
    "error": "SQLITE_CANTOPEN: unable to open database file",
    "code": "FETCH_PRODUCTS_ERROR"
}
```

---

### 2. **createProduct - Criar Novo Produto**

#### Função Atual (Async/Await)
```javascript
const createProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;

        // Validações de entrada
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Nome é obrigatório e deve ser uma string não vazia.',
                code: 'INVALID_NAME'
            });
        }
        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Quantidade deve ser um número maior ou igual a 0.',
                code: 'INVALID_QUANTITY'
            });
        }
        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Preço deve ser um número maior que 0.',
                code: 'INVALID_PRICE'
            });
        }

        // Verificar se nome já existe
        const existingProduct = await dbGet('SELECT id FROM products WHERE name = ?', [name.trim()]);
        if (existingProduct) {
            return res.status(409).json({ 
                success: false,
                error: 'Já existe um produto com este nome.',
                code: 'PRODUCT_ALREADY_EXISTS'
            });
        }

        // Inserir novo produto
        const insertResult = await dbRun(
            'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
            [name.trim(), quantity, price]
        );

        const productId = insertResult.lastID;

        // Registrar movimentação de entrada
        if (quantity > 0) {
            await dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [productId, 'IN', quantity]
            );
        }

        // Registrar log de auditoria (não-bloqueante)
        logAudit(
            req.user.id,
            'CREATE',
            'products',
            productId,
            null,
            { name: name.trim(), quantity, price }
        );

        res.status(201).json({
            success: true,
            message: 'Produto adicionado com sucesso',
            data: {
                id: productId,
                name: name.trim(),
                quantity,
                price
            }
        });
    } catch (err) {
        console.error('❌ Erro ao criar produto:', err.message);
        
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ 
                success: false,
                error: 'Já existe um produto com este nome.',
                code: 'DUPLICATE_PRODUCT'
            });
        }

        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'CREATE_PRODUCT_ERROR'
        });
    }
};
```

#### Exemplos de Chamadas

##### ✅ Exemplo 1: Criar produto com sucesso
```javascript
// Requisição
POST /api/products
Content-Type: application/json

{
    "name": "Monitor LG 24 polegadas",
    "quantity": 10,
    "price": 800
}

// Resposta (201 Created)
{
    "success": true,
    "message": "Produto adicionado com sucesso",
    "data": {
        "id": 5,
        "name": "Monitor LG 24 polegadas",
        "quantity": 10,
        "price": 800
    }
}
```

**O que acontece internamente:**
1. ✅ Validação: nome é string não-vazia ✓
2. ✅ Validação: quantity = 10 (número >= 0) ✓
3. ✅ Validação: price = 800 (número > 0) ✓
4. ✅ `await dbGet()` verifica se produto já existe
5. ✅ `await dbRun()` insere na tabela products
6. ✅ `await dbRun()` registra movimentação IN
7. ✅ `logAudit()` dispara em background (não-bloqueante)
8. ✅ Responde ao cliente com ID do novo produto

---

##### ❌ Erro 1: Nome vazio
```javascript
// Requisição
POST /api/products
Content-Type: application/json

{
    "name": "",
    "quantity": 10,
    "price": 800
}

// Resposta (400 Bad Request)
{
    "success": false,
    "error": "Nome é obrigatório e deve ser uma string não vazia.",
    "code": "INVALID_NAME"
}

// ✅ Validação RÁPIDA no topo da função
// Não chega a fazer operações no banco de dados
```

---

##### ❌ Erro 2: Quantidade inválida
```javascript
// Requisição
POST /api/products
Content-Type: application/json

{
    "name": "Monitor",
    "quantity": "dez",  // ❌ String, não número!
    "price": 800
}

// Resposta (400 Bad Request)
{
    "success": false,
    "error": "Quantidade deve ser um número maior ou igual a 0.",
    "code": "INVALID_QUANTITY"
}
```

---

##### ❌ Erro 3: Preço inválido
```javascript
// Requisição
POST /api/products
Content-Type: application/json

{
    "name": "Monitor",
    "quantity": 10,
    "price": 0  // ❌ Preço deve ser > 0
}

// Resposta (400 Bad Request)
{
    "success": false,
    "error": "Preço deve ser um número maior que 0.",
    "code": "INVALID_PRICE"
}
```

---

##### ❌ Erro 4: Produto já existe (ANTES do try/catch)
```javascript
// Requisição
POST /api/products
Content-Type: application/json

{
    "name": "Monitor LG 24 polegadas",  // Já existe!
    "quantity": 5,
    "price": 800
}

// Resposta (409 Conflict)
{
    "success": false,
    "error": "Já existe um produto com este nome.",
    "code": "PRODUCT_ALREADY_EXISTS"
}

// ✅ Validação DUPLA:
// 1. Checagem no banco de dados (ANTES de inserir)
// 2. Captura de erro UNIQUE constraint (se falhar de outra forma)
```

---

##### ❌ Erro 5: Falha no banco de dados (CAPTURADO pelo try/catch)
```javascript
// Se o dbRun() falhar (ex: disco cheio, sem permissão)
// Resposta (500 Internal Server Error)
{
    "success": false,
    "error": "disk I/O error",
    "code": "CREATE_PRODUCT_ERROR"
}

// ✅ O erro é capturado pelo try/catch
// ✅ Cliente recebe mensagem clara
```

---

### 3. **updateProduct - Atualizar Quantidade**

#### Função Atual (Async/Await)
```javascript
const updateProduct = async (req, res) => {
    try {
        const { quantity: newQuantity } = req.body;
        const productId = req.params.id;

        // Validar quantidade
        if (typeof newQuantity !== 'number' || newQuantity < 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Quantidade deve ser um número maior ou igual a 0.',
                code: 'INVALID_QUANTITY'
            });
        }

        // Buscar produto existente
        const product = await dbGet('SELECT quantity FROM products WHERE id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: 'Produto não encontrado.',
                code: 'PRODUCT_NOT_FOUND'
            });
        }

        const currentQuantity = product.quantity;
        const difference = newQuantity - currentQuantity;

        // Se quantidade é igual, retornar sucesso
        if (difference === 0) {
            return res.json({ 
                success: true,
                message: 'Quantidade já está atualizada.',
                changes: 0 
            });
        }

        // Atualizar quantidade
        const updateResult = await dbRun(
            'UPDATE products SET quantity = ? WHERE id = ?',
            [newQuantity, productId]
        );

        // Registrar log de auditoria
        logAudit(
            req.user.id,
            'UPDATE',
            'products',
            productId,
            { quantity: currentQuantity },
            { quantity: newQuantity }
        );

        // Registrar movimentação de estoque
        if (difference > 0) {
            await dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [productId, 'IN', difference]
            );
        } else if (difference < 0) {
            await dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [productId, 'OUT', Math.abs(difference)]
            );
        }

        res.json({ 
            success: true,
            message: 'Quantidade atualizada com sucesso',
            data: {
                id: productId,
                newQuantity,
                difference,
                changes: updateResult.changes
            }
        });
    } catch (err) {
        console.error('❌ Erro ao atualizar produto:', err.message);
        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'UPDATE_PRODUCT_ERROR'
        });
    }
};
```

#### Exemplos de Chamadas

##### ✅ Exemplo 1: Aumentar estoque
```javascript
// Requisição
PATCH /api/products/2
Content-Type: application/json

{
    "quantity": 50
}

// Suponha que produto ID 2 tinha quantity = 20
// Resposta (200 OK)
{
    "success": true,
    "message": "Quantidade atualizada com sucesso",
    "data": {
        "id": 2,
        "newQuantity": 50,
        "difference": 30,  // +30 unidades
        "changes": 1
    }
}

// ✅ Registra movimentação: type='IN', quantity=30
// ✅ Log de auditoria: oldValues={20}, newValues={50}
```

---

##### ✅ Exemplo 2: Reduzir estoque
```javascript
// Requisição
PATCH /api/products/2
Content-Type: application/json

{
    "quantity": 10
}

// Supondo que produto tinha quantity = 50
// Resposta (200 OK)
{
    "success": true,
    "message": "Quantidade atualizada com sucesso",
    "data": {
        "id": 2,
        "newQuantity": 10,
        "difference": -40,  // -40 unidades
        "changes": 1
    }
}

// ✅ Registra movimentação: type='OUT', quantity=40
```

---

##### ❌ Erro 1: Produto não encontrado
```javascript
// Requisição
PATCH /api/products/999
Content-Type: application/json

{
    "quantity": 50
}

// Resposta (404 Not Found)
{
    "success": false,
    "error": "Produto não encontrado.",
    "code": "PRODUCT_NOT_FOUND"
}

// ✅ Verificação: const product = await dbGet(...)
// Se não encontrar, retorna 404
```

---

##### ❌ Erro 2: Quantidade inválida
```javascript
// Requisição
PATCH /api/products/2
Content-Type: application/json

{
    "quantity": -10  // ❌ Negativo
}

// Resposta (400 Bad Request)
{
    "success": false,
    "error": "Quantidade deve ser um número maior ou igual a 0.",
    "code": "INVALID_QUANTITY"
}
```

---

### 4. **deleteProduct - Deletar Produto**

#### Exemplos de Chamadas

##### ✅ Exemplo 1: Deletar produto com sucesso
```javascript
// Requisição
DELETE /api/products/5

// Resposta (200 OK)
{
    "success": true,
    "message": "Produto excluído com sucesso",
    "data": {
        "id": 5,
        "changes": 1
    }
}

// ✅ Armazena dados antigos no log de auditoria
// ✅ Depois deleta do banco
// ✅ Log fica como prova de auditoria
```

---

##### ❌ Erro: Produto não encontrado
```javascript
// Requisição
DELETE /api/products/999

// Resposta (404 Not Found)
{
    "success": false,
    "error": "Produto não encontrado.",
    "code": "PRODUCT_NOT_FOUND"
}
```

---

## 🚨 Tratamento de Erros

### Padrão Try/Catch Utilizado

```javascript
const functionName = async (req, res) => {
    try {
        // 1️⃣ Validações (no topo)
        if (!value) {
            return res.status(400).json({ error: '...' });
        }

        // 2️⃣ Operação 1 - Buscar dados
        const data = await dbGet(...);
        if (!data) {
            return res.status(404).json({ error: '...' });
        }

        // 3️⃣ Operação 2 - Modificar dados
        const result = await dbRun(...);

        // 4️⃣ Operação 3 - Registrar log (não-bloqueante)
        logAudit(...);

        // 5️⃣ Responder ao cliente
        res.json({ success: true, data: result });

    } catch (err) {
        // ✅ TODOS os erros não previstos caem aqui
        console.error('❌ Erro:', err.message);
        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'ERROR_CODE'
        });
    }
};
```

### Tipos de Erro Capturados

| Tipo | Onde é Capturado | Resposta HTTP |
|------|------------------|---------------|
| Validação de input | Guard clause (fora do try) | 400 |
| Recurso não encontrado | Guard clause (fora do try) | 404 |
| Recurso duplicado | Guard clause (fora do try) | 409 |
| Erro no banco de dados | `catch (err)` | 500 |
| Erro de permissão | `catch (err)` | 500 |
| Erro de disco/sistema | `catch (err)` | 500 |

---

## 🧪 Testes com cURL

### Teste Completo da API

```bash
# 1️⃣ Criar um produto
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "SSD 256GB",
    "quantity": 15,
    "price": 200
  }'

# Resposta esperada:
# {
#   "success": true,
#   "message": "Produto adicionado com sucesso",
#   "data": {
#     "id": 10,
#     "name": "SSD 256GB",
#     "quantity": 15,
#     "price": 200
#   }
# }
```

```bash
# 2️⃣ Listar todos os produtos
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
# {
#   "success": true,
#   "data": [
#     { "id": 1, "name": "Monitor", "quantity": 5, "price": 800 },
#     { "id": 10, "name": "SSD 256GB", "quantity": 15, "price": 200 },
#     ...
#   ],
#   "count": X
# }
```

```bash
# 3️⃣ Buscar produto específico (filtro)
curl "http://localhost:3000/api/products?search=SSD" \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
# {
#   "success": true,
#   "data": [
#     { "id": 10, "name": "SSD 256GB", "quantity": 15, "price": 200 }
#   ],
#   "count": 1
# }
```

```bash
# 4️⃣ Listar produtos com estoque baixo
curl "http://localhost:3000/api/products?lowStock=true" \
  -H "Authorization: Bearer SEU_TOKEN"

# Retorna apenas produtos com quantity < 5
```

```bash
# 5️⃣ Atualizar quantidade do produto
curl -X PATCH http://localhost:3000/api/products/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "quantity": 25
  }'

# Resposta esperada:
# {
#   "success": true,
#   "message": "Quantidade atualizada com sucesso",
#   "data": {
#     "id": 10,
#     "newQuantity": 25,
#     "difference": 10,
#     "changes": 1
#   }
# }
```

```bash
# 6️⃣ Deletar produto
curl -X DELETE http://localhost:3000/api/products/10 \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta esperada:
# {
#   "success": true,
#   "message": "Produto excluído com sucesso",
#   "data": {
#     "id": 10,
#     "changes": 1
#   }
# }
```

### Teste de Erros

```bash
# ❌ Teste: Criar produto com nome vazio
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "",
    "quantity": 10,
    "price": 200
  }'

# Esperado: 400 Bad Request
# {
#   "success": false,
#   "error": "Nome é obrigatório e deve ser uma string não vazia.",
#   "code": "INVALID_NAME"
# }
```

```bash
# ❌ Teste: Atualizar produto inexistente
curl -X PATCH http://localhost:3000/api/products/999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "quantity": 50
  }'

# Esperado: 404 Not Found
# {
#   "success": false,
#   "error": "Produto não encontrado.",
#   "code": "PRODUCT_NOT_FOUND"
# }
```

---

## 🎓 Padrões Aplicados

### 1. Guard Clauses
```javascript
// ✅ Validar NO TOPO, retornar cedo
if (!name) {
    return res.status(400).json(...);
}
if (!quantity) {
    return res.status(400).json(...);
}

// Agora prosseguir com confiança
```

### 2. Single Responsibility
```javascript
// ✅ Cada função faz UMA coisa
getAllProducts     // Listar
createProduct      // Criar
updateProduct      // Atualizar
deleteProduct      // Deletar
logAudit          // Auditar (reutilizada)
```

### 3. Error Handling (Try/Catch)
```javascript
// ✅ Localizado em um lugar
try {
    // Todas as operações
} catch (err) {
    // Tratamento centralizado
}
```

### 4. Fire-and-Forget Pattern
```javascript
// ✅ Não bloqueia a resposta
logAudit(...);  // Sem await

// Resposta rápida ao cliente
res.json({ success: true });
// Log salva em background
```

### 5. Status HTTP Corretos
```javascript
// ✅ Usar códigos apropriados
201 Created    // POST com sucesso
400 Bad Request // Validação falhou
404 Not Found   // Recurso não encontrado
409 Conflict    // Duplicado
500 Error       // Erro do servidor
```

---

## ❓ FAQ

### P1: Por que usar `async/await` em vez de `.then()`?

**R:** Async/await é mais legível:

```javascript
// ❌ .then() - Callback Hell
dbGet(sql).then(product => {
    if (!product) return;
    dbRun(sql2).then(result => {
        logAudit(...).then(() => {
            res.json({ success: true });
        });
    });
});

// ✅ async/await - Linear
const product = await dbGet(sql);
if (!product) return;
const result = await dbRun(sql2);
await logAudit(...);
res.json({ success: true });
```

---

### P2: Por que `logAudit()` não tem `await`?

**R:** Para não bloquear a resposta HTTP:

```javascript
// ❌ COM await (LENTO)
await logAudit(...);     // Aguarda 50ms
res.json({ success: true });  // Resposta atrasada

// ✅ SEM await (RÁPIDO)
logAudit(...);           // Dispara em background
res.json({ success: true });  // Resposta imediata
// Log salva alguns ms depois (transparente pro cliente)
```

---

### P3: Como o try/catch captura erros do banco?

**R:** Porque `await` propaga exceções:

```javascript
try {
    // Se dbRun() falhar, lança exceção
    const result = await dbRun(...);
    
    // Se dbGet() retorna null, NÃO lança (precisa validar)
    const product = await dbGet(...);
    
} catch (err) {
    // Exceções de banco chegam aqui
    // Erros de lógica (null, undefined) NÃO chegam
}
```

---

### P4: Por que validar ANTES do try/catch?

**R:** Mais eficiente e claro:

```javascript
// ✅ Validações ANTES (não precisam de try/catch)
if (!name) return res.status(400).json(...);
if (!quantity) return res.status(400).json(...);

try {
    // Apenas operações de banco que podem falhar
    const result = await dbRun(...);
} catch (err) {
    // Erro no banco (não de validação)
}
```

---

### P5: E se um produto tiver dois usuários atualizando ao mesmo tempo?

**R:** SQLite usa locks automáticos:

```javascript
// Usuário 1
const product = await dbGet(...);  // Lê: quantity = 10
// ... processamento ...
await dbRun(..., [20]);             // Escreve: quantity = 20

// Usuário 2 (simultâneo)
const product = await dbGet(...);  // Aguarda lock do usuário 1
// Lê: quantity = 20 (valor atualizado)
await dbRun(..., [5]);              // Escreve: quantity = 5

// ✅ Sem race conditions, SQLite gerencia locks automáticos
```

---

## 📊 Resumo de Melhorias

| Aspecto | Antes (Callbacks) | Depois (Async/Await) |
|---------|------------------|---------------------|
| **Legibilidade** | Difícil (aninhado) | Excelente (linear) |
| **Tratamento de Erro** | Repetido | Centralizado |
| **Validações** | Espalhadas | Topo claro |
| **Performance Logging** | Bloqueante | Não-bloqueante |
| **Manutenção** | Difícil | Fácil |
| **Debugging** | Stack trace confuso | Stack trace claro |
| **Profissionalismo** | ❌ | ✅ |

---

## 🚀 Próximos Passos

1. ✅ **Agora:** Understand padrões aplicados aqui
2. ⏭️ **Próximo:** Aplicar mesmo padrão a `dashboardController.js`
3. ⏭️ **Próximo:** Aplicar mesmo padrão a `authController.js`
4. ⏭️ **Próximo:** Implementar rate limiting
5. ⏭️ **Próximo:** Adicionar testes automatizados

