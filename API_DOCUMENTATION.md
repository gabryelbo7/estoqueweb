# 📚 Documentação da API de Autenticação JWT

## Visão Geral

Sistema completo de autenticação com JWT (JSON Web Token) em Node.js com suporte a roles (**admin** e **employee/funcionario**).

---

## 🔐 Aplicativos Padrão

### Credenciais de Teste

| Usuário | Senha | Role | Permissão |
|---------|-------|------|-----------|
| **admin** | admin123 | admin | Acesso total (criar, editar, deletar) |
| **funcionario** | func123 | employee | Acesso modificado (visualizar, editar quantidade) |

---

## 📡 Endpoints da API

### 1. **POST /api/auth/login**
Faz login no sistema e retorna um JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (201 - Sucesso):**
```json
{
  "message": "Login realizado com sucesso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Response (401 - Erro de Autenticação):**
```json
{
  "error": "Credenciais inválidas."
}
```

---

### 2. **POST /api/auth/register**
Registra um novo usuário no sistema.

**Request:**
```json
{
  "username": "novo_usuario",
  "password": "senha123",
  "role": "employee"
}
```

**Parameters:**
- `username` (string, obrigatório): Mínimo 3 caracteres
- `password` (string, obrigatório): Mínimo 6 caracteres
- `role` (string, opcional): "admin" ou "employee" (padrão: "employee")

**Response (201 - Sucesso):**
```json
{
  "message": "Usuário registrado com sucesso.",
  "user": {
    "username": "novo_usuario",
    "role": "employee"
  }
}
```

**Response (400 - Validação falhou):**
```json
{
  "error": "Usuário deve ter pelo menos 3 caracteres."
}
```

**Response (409 - Usuário já existe):**
```json
{
  "error": "Este usuário já existe."
}
```

---

## 🎯 Endpoints Protegidos com Autenticação

Todos os endpoints abaixo requerem um **JWT Token** no header:

```bash
Authorization: Bearer <seu_token_jwt>
```

### 3. **GET /api/products**
Lista todos os produtos.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Teclado USB",
      "quantity": 50,
      "price": 89.90
    }
  ]
}
```

---

### 4. **POST /api/products**
Cria um novo produto. ⚠️ **Requer role: admin**

**Request:**
```json
{
  "name": "Monitor 24\"",
  "quantity": 10,
  "price": 599.90
}
```

**Response (201):**
```json
{
  "message": "Produto criado com sucesso.",
  "product": {
    "id": 2,
    "name": "Monitor 24\"",
    "quantity": 10,
    "price": 599.90
  }
}
```

**Response (403 - Sem permissão):**
```json
{
  "error": "Acesso negado. Requer privilégios de administrador.",
  "code": "ADMIN_REQUIRED",
  "userRole": "employee"
}
```

---

### 5. **PUT /api/products/:id**
Atualiza um produto. ✅ **Permitido para admin e employee**

**Request:**
```json
{
  "quantity": 25,
  "price": 99.90
}
```

**Response (200):**
```json
{
  "message": "Produto atualizado com sucesso.",
  "product": {
    "id": 1,
    "name": "Teclado USB",
    "quantity": 25,
    "price": 99.90
  }
}
```

---

### 6. **DELETE /api/products/:id**
Deleta um produto. ⚠️ **Requer role: admin**

**Response (200):**
```json
{
  "message": "Produto deletado com sucesso."
}
```

---

## 🔒 Middleware de Proteção

### `authenticateToken`
Middleware que valida o JWT token.

**Erros possíveis:**
- `401`: Token não fornecido (NO_TOKEN)
- `401`: Token expirado (TOKEN_EXPIRED)
- `403`: Token inválido (INVALID_TOKEN)

### `requireAdmin`
Verifica se o usuário tem role **admin**.

### `requireEmployee`
Verifica se o usuário tem role **admin** ou **employee**.

### `requireEmployeeOnly`
Verifica se o usuário tem role **employee** (não admin).

---

## 💾 Banco de Dados

### Tabelas

#### `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin', 'employee'))
);
```

#### `products`
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    price REAL NOT NULL DEFAULT 0.0 CHECK(price > 0)
);
```

#### `audit_logs` (Auditoria)
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🧪 Exemplos de Uso com cURL

### 1. **Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. **Registrar novo usuário**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"novo_user","password":"senha123","role":"employee"}'
```

### 3. **Listar produtos (com token)**
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI"
```

### 4. **Criar produto (somente admin)**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mouse Gamer","quantity":20,"price":149.90}'
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
JWT_SECRET=seu_segredo_super_seguro_aqui
PORT=3000
NODE_ENV=development
```

**Importante:** Em produção, use um segredo JWT forte e não exponha o `.env` no git!

---

## 🔑 JWT Token

Um token JWT contém:

```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

- **Validade:** 24 horas
- **Algoritmo:** HS256

---

## 🚀 Fluxo de Autenticação

```
1. Usuário faz POST /api/auth/login com credenciais
   ↓
2. Sistema valida usuário e senha
   ↓
3. JWT token é gerado com role do usuário
   ↓
4. Token retornado ao cliente
   ↓
5. Cliente envia token em cada requisição (header Authorization)
   ↓
6. Middleware valida token e extraia dados do usuário
   ↓
7. Requisição é processada com verificação de role
```

---

## 📋 Resumo de Permissões

| Action | Admin | Employee |
|--------|-------|----------|
| POST /api/products | ✅ | ❌ |
| GET /api/products | ✅ | ✅ |
| PUT /api/products/:id | ✅ | ✅ |
| DELETE /api/products/:id | ✅ | ❌ |

---

## ❓ Dúvidas Frequentes

**P: Como alterar a senha de um usuário?**
R: Crie um endpoint `/api/auth/change-password` seguindo o mesmo padrão.

**P: Como fazer logout?**
R: O logout é feito no lado do cliente removendo o token do localStorage.

**P: O token expira?**
R: Sim, tokens expiram em 24 horas. Implemente um refresh token para sessões mais longas.

**P: Como adicionar mais roles?**
R: Modifique a constraint da coluna `role` na tabela `users` e atualize o middleware de validação.

---

## 📞 Suporte

Para problemas ou sugestões, verifique os logs do servidor e os erros retornados pela API.
