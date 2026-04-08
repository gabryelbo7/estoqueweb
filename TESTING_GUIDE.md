# 🧪 GUIA DE TESTES - REFATORAÇÃO DO SISTEMA

## ✅ Testes Rápidos para Validar a Refatoração

### Pré-requisitos
```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start
```

O servidor rodará em **http://localhost:3000**

---

## 1️⃣ TESTE DE AUTENTICAÇÃO (Bcrypt Assíncrono)

### Registrar novo usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "teste123",
    "role": "employee"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso.",
  "user": {
    "username": "testuser",
    "role": "employee"
  }
}
```

### Fazer login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**⚠️ Nota:** Salve o `token` para os próximos testes!

---

## 2️⃣ TESTE DO DASHBOARD (Promise.all Paralelo)

### Sem autenticação (deve falhar)
```bash
curl -X GET http://localhost:3000/api/dashboard
```

**Resposta (erro esperado):**
```json
{
  "error": "Token de acesso não fornecido.",
  "code": "NO_TOKEN"
}
```

### Com autenticação (Promise.all em ação)
```bash
# Substitua <TOKEN> pelo token recebido no login
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta esperada:**
```json
{
  "success": true,
  "timestamp": "2024-04-07T10:30:45.123Z",
  "summary": {
    "totalProdutos": 42,
    "valorTotalEstoque": 15000.50,
    "produtosComEstoqueBaixo": 8
  },
  "details": {
    "produtosDetalhes": [
      {
        "id": 1,
        "name": "Produto A",
        "quantity": 2,
        "price": 100,
        "valorProduto": 200
      }
    ],
    "totalLinhasEstoque": 25,
    "valorEmEstoqueBaixo": 2500.00
  }
}
```

**✅ O que valida:**
- 3 queries executadas em PARALELO
- Resposta estruturada com summary e details
- Tempo de resposta otimizado

---

## 3️⃣ TESTE DE PRODUTOS (Async/Await)

### Listar produtos
```bash
curl -X GET "http://localhost:3000/api/products?search=produto" \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Produto Test",
      "quantity": 100,
      "price": 50.00
    }
  ],
  "count": 1
}
```

### Criar produto (apenas admin)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Produto XYZ",
    "quantity": 50,
    "price": 99.99
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Produto adicionado com sucesso",
  "data": {
    "id": 2,
    "name": "Novo Produto XYZ",
    "quantity": 50,
    "price": 99.99
  }
}
```

### Atualizar quantidade de produto
```bash
# Substitua <ID> pelo ID do produto
curl -X PUT http://localhost:3000/api/products/<ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 30
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Quantidade atualizada com sucesso",
  "data": {
    "id": 2,
    "newQuantity": 30,
    "difference": -20,
    "changes": 1
  }
}
```

**✅ O que valida:**
- Movimento de estoque registrado (OUT: -20)
- Log de auditoria criado
- Resposta estruturada com sucesso

### Listar produtos com estoque baixo
```bash
curl -X GET "http://localhost:3000/api/products?lowStock=true" \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Produto Com Pouco Estoque",
      "quantity": 3,
      "price": 10.00
    }
  ],
  "count": 1
}
```

### Deletar produto (apenas admin)
```bash
curl -X DELETE http://localhost:3000/api/products/<ID> \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Produto excluído com sucesso",
  "data": {
    "id": 2,
    "changes": 1
  }
}
```

---

## 4️⃣ TESTE DE TRATAMENTO DE ERROS (Global Error Handler)

### Teste 1: Entrada inválida
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "quantity": -10,
    "price": 0
  }'
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "error": "Nome é obrigatório e deve ser uma string não vazia.",
  "code": "INVALID_NAME"
}
```

### Teste 2: Acesso não autorizado
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN_EMPLOYEE>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto","quantity":10,"price":99.99}'
```

**Resposta esperada (403):**
```json
{
  "error": "Acesso negado. Requer privilégios de administrador.",
  "code": "ADMIN_REQUIRED"
}
```

### Teste 3: Produto não encontrado
```bash
curl -X PUT http://localhost:3000/api/products/99999 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100}'
```

**Resposta esperada (404):**
```json
{
  "success": false,
  "error": "Produto não encontrado.",
  "code": "PRODUCT_NOT_FOUND"
}
```

### Teste 4: Duplicação (mesmo nome)
```bash
# Primeiro cria
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Único","quantity":10,"price":99.99}'

# Tenta criar novamente com mesmo nome
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Único","quantity":15,"price":79.99}'
```

**Resposta esperada (409):**
```json
{
  "success": false,
  "error": "Já existe um produto com este nome.",
  "code": "DUPLICATE_PRODUCT"
}
```

---

## 5️⃣ VERIFICAÇÃO DE MELHORIAS DE PERFORMANCE

### Teste antes (sem refatoração):
- 3 queries sequenciais (~300ms)

### Teste depois (com refatoração):
```bash
# Instale ferramentas de medição
npm install autocannon -g

# Execute teste de carga
autocannon -c 10 -d 30 "http://localhost:3000/api/dashboard"
```

**Resultado esperado:**
- Throughput: ~100-150 req/s
- Latência média: <50ms
- Sem timeouts

---

## 6️⃣ CHECKLIST FINAL ✅

- [ ] Login funciona com bcrypt.compare() assíncrono
- [ ] Registro funciona com bcrypt.hash() assíncrono
- [ ] Dashboard retorna 3 queries em paralelo (~100ms)
- [ ] Produtos criados registram movimento de estoque
- [ ] Atualizar quantidade registra auditoria
- [ ] Deletar produto retorna resposta estruturada
- [ ] Erros retornam JSON com `success: false`
- [ ] Erros de validação têm `code` específico
- [ ] Acesso não autorizado retorna 403
- [ ] Servidor não cai com erros
- [ ] Logging aparece no console com timestamps

---

## 🐛 Troubleshooting

### Erro: "Token inválido ou expirado"
```javascript
// Gere um novo token com login
```

### Erro: "SQLITE_CANTOPEN"
```bash
# Verifique permissão de pasta
chmod 755 .

# Delete banco antigo se necessário
rm estoque.db
```

### Erro: "Cannot find module 'errorHandler'"
```bash
# Verifique se o arquivo foi criado
ls -la middleware/errorHandler.js

# Reinstale dependências
npm install
```

---

## 📊 Comparação Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Callbacks | Aninhados (Hell) | ✅ Async/Await |
| Performance Dashboard | Sequencial 300ms | ✅ Paralelo 100ms |
| Bcrypt | Síncrono (bloqueia) | ✅ Assíncrono |
| Tratamento de Erro | Por rota | ✅ Global centralizado |
| Respostas | Inconsistentes | ✅ Padrão JSON |
| Auditoria | Parcial | ✅ Completa |
| Event Loop | Bloqueado | ✅ Livre |

---

**Última atualização:** 2024-04-07
**Status:** ✅ PRONTO PARA TESTE
