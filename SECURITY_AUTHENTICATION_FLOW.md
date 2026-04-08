# 🔐 Fluxo de Autenticação e Segurança

## 📋 Visão Geral

Este documento detalha o **fluxo de autenticação** do sistema, incluindo:
- ✅ Como o login funciona
- ✅ Proteção de páginas HTML
- ✅ Redirecionamento baseado em role
- ✅ Melhores práticas de segurança

---

## 🔄 Fluxo Completo de Autenticação

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO ACESSA                       │
│              http://localhost:3000/ (raiz)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │  login.html é exibido   │
         │  (página pública)       │
         └────────────┬────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │  Usuário preenche credenciais:       │
         │  - Username                          │
         │  - Password                          │
         └────────────┬─────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │  POST /api/auth/login                │
         │  authController.js processa          │
         └────────────┬─────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │  ✓ Usuário encontrado?               │
         │  ✓ Senha correta?                    │
         │  ✓ Role válido (admin/employee)?     │
         └────────────┬─────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼ SIM                     ▼ NÃO
    ┌─────────────┐           ┌──────────────┐
    │ JWT gerado  │           │ Erro 401     │
    └──────┬──────┘           └──────────────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  Resposta JSON:                      │
    │  {                                   │
    │    token: "jwt_token_aqui",          │
    │    user: {                           │
    │      id, username, role, store_id    │
    │    }                                 │
    │  }                                   │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │  login.js processa resposta:         │
    │  1. Salva token em localStorage      │
    │  2. Salva user em localStorage       │
    │  3. Server envia token em cookie     │
    │     HTTP-only (automático)           │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │  Função redirectByRole(role):        │
    │  Redireciona para:                   │
    │  - /admin.html (se role = admin)     │
    │  - /employee.html (se role = emp.)   │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │  Middleware protectAdminPage:        │
    │  Verifica se:                        │
    │  1. req.user existe (do cookie)      │
    │  2. role === 'admin'                 │
    └──────────┬───────────────────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
     ▼ AUTORIZADO         ▼ NÃO AUTORIZADO
 ┌────────────┐      ┌──────────────────┐
 │ Serve HTML │      │ Redireciona para │
 └────────────┘      │ /login.html      │
                     │ com erro query   │
                     └──────────────────┘
```

---

## 🔑 Componentes-Chave

### 1️⃣ **Página de Login** (`login.html`)
- **Rota:** `GET /` ou `GET /login.html`
- **Proteção:** ❌ Pública (nenhuma autenticação necessária)
- **Função:** Exibe formulário de login

### 2️⃣ **Endpoint de Login** (`POST /api/auth/login`)
- **Arquivo:** `controllers/authController.js`
- **Responsabilidade:**
  - Validar credenciais (username + password)
  - Verificar se a senha está correta (bcrypt)
  - Gerar JWT token com role e store_id
  - **Enviar token em cookie HTTP-only** (seguro)
  - Retornar JSON com token e dados do usuário

```javascript
// Exemplo de resposta:
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "token": "eyJhbGc...", // Também retorna para localStorage
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "store_id": 1
  }
}
```

### 3️⃣ **Frontend - login.js**
- **Responsabilidades:**
  - Enviar credenciais para `/api/auth/login`
  - Salvar token em **localStorage** (para requisições API)
  - Salvar user em **localStorage** (para UI)
  - Chamar `redirectByRole(role)` após sucesso

```javascript
// login.js - handleLogin()
async function handleLogin(e) {
    const response = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    // Salvar dados localmente
    setToken(data.token);        // localStorage.setItem('token', ...)
    setUser(data.user);          // localStorage.setItem('user', ...)

    // Redirecionar
    redirectByRole(data.user.role);
}
```

### 4️⃣ **Redirecionamento por Role** (`redirectByRole()`)
- **Admin:** `window.location.href = '/admin.html'`
- **Employee:** `window.location.href = '/employee.html'`

### 5️⃣ **Proteção de Páginas HTML** (server.js)

#### A) **Middleware protectAdminPage**
```javascript
const protectAdminPage = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.redirect('/login.html?error=admin_only');
    }
    next();
};

app.get('/admin.html', protectAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
```

#### B) **Middleware protectEmployeePage**
```javascript
const protectEmployeePage = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        return res.redirect('/login.html?error=employee_only');
    }
    next();
};

app.get('/employee.html', protectEmployeePage, (req, res) => {
    res.sendFile(path.join(__dirname, 'employee.html'));
});
```

#### C) **Middleware verifyTokenFromCookie**
```javascript
const verifyTokenFromCookie = (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;  // Disponível para middlewares posteriores
        } catch (err) {
            console.log('Token inválido ou expirado');
        }
    }
    next();
};

app.use(verifyTokenFromCookie);
```

---

## 🛡️ Camadas de Segurança

### **Camada 1: Token em Cookie HTTP-only**
```javascript
// authController.js - linha 62
res.cookie('token', token, {
    httpOnly: true,    // ✅ Protege contra XSS
    secure: process.env.NODE_ENV === 'production',  // ✅ HTTPS
    sameSite: 'strict', // ✅ Proteção CSRF
    maxAge: 24 * 60 * 60 * 1000 // 24h
});
```

**Benefícios:**
- ❌ JavaScript não consegue acessar (protege XSS)
- ✅ Enviado automaticamente em cada requisição
- ✅ Protegido contra CSRF com `sameSite: strict`

### **Camada 2: Verificação de Autenticação nas Rotas**
Toda página protegida verifica token ANTES de servir:
```javascript
app.get('/admin.html', protectAdminPage, (req, res) => {
    // Token é verificado aqui, redireciona se inválido
    res.sendFile(path.join(__dirname, 'admin.html'));
});
```

### **Camada 3: Verificação de Role**
Admin vs Employee são validados:
```javascript
if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login.html?error=admin_only');
}
```

### **Camada 4: Senha com Bcrypt**
```javascript
// authController.js - linha 40
const isValidPassword = await bcrypt.compare(password, user.password);
```

---

## 📱 Cenários de Uso

### ✅ **Cenário 1: Login Bem-Sucedido**

**Ação:** Usuário admin faz login com credenciais corretas

**Fluxo:**
1. Submete formulário → `/api/auth/login`
2. AuthController verifica credenciais ✓
3. Gera JWT e envia em cookie HTTP-only
4. Retorna `{ success: true, token, user }`
5. login.js salva token em localStorage
6. Chama `redirectByRole('admin')`
7. GET `/admin.html` com cookie
8. `protectAdminPage` valida token ✓
9. HTML é servido ✓

### ❌ **Cenário 2: Credenciais Inválidas**

**Ação:** Usuário preenche senha errada

**Fluxo:**
1. Submete formulário → `/api/auth/login`
2. `bcrypt.compare()` retorna `false`
3. Server responde com erro 401
4. login.js exibe: "❌ Credenciais inválidas."
5. Usuário permanece na página de login

### ❌ **Cenário 3: Acesso Não Autorizado**

**Ação:** Usuário employee tenta acessar `/admin.html`

**Fluxo:**
1. User tem token válido mas role = "employee"
2. GET `/admin.html`
3. `protectAdminPage` verifica: `role !== 'admin'`
4. Redireciona para `/login.html?error=admin_only`
5. login.js mostra: "⚠️ Acesso restrito a administradores"

### ❌ **Cenário 4: Cookie Expirado**

**Ação:** Usuário tenta acessar página após 24h

**Fluxo:**
1. GET `/admin.html`
2. `verifyTokenFromCookie` tenta verificar token
3. `jwt.verify()` lança `TokenExpiredError`
4. `req.user` fica undefined
5. `protectAdminPage` verifica: `!req.user`
6. Redireciona para `/login.html?error=admin_only`
7. Usuário precisa fazer login novamente

---

## 🚀 Fluxo de API com Token

### **Para Requisições de API** (produtos, dashboard, etc.)

O token é **armazenado em localStorage** e enviado como Bearer token:

```javascript
// script.js - getAuthHeaders()
function getAuthHeaders() {
    const token = getToken();
    return token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
    } : { 'Content-Type': 'application/json' };
}

// Uso:
fetch('/api/products', {
    headers: getAuthHeaders()
});
```

**Middleware de verificação:**
```javascript
// middleware/auth.js
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};
```

---

## 📝 Modificações Implementadas

### **1. server.js**
- ✅ Adicionado `cookie-parser`
- ✅ Middleware `verifyTokenFromCookie` para cookies
- ✅ Middlewares `protectAdminPage` e `protectEmployeePage`
- ✅ Atualizado `app.get('/admin.html')` para servir `admin.html`

### **2. controllers/authController.js**
- ✅ Adicionado envio de token em cookie HTTP-only
- ✅ Configuração segura (httpOnly, secure, sameSite)

### **3. login.js**
- ✅ Simplificado: agora só verifica `user`, não precisa de token
- ✅ Adicionada função `handleLogout()` global
- ✅ Adicionada função `getAuthHeaders()` para requisições API
- ✅ Melhorado `redirectByRole()` com logging

### **4. index.html → admin.html**
- ✅ Renomeado para maior clareza
- ✅ Server agora serve `/admin.html` para admins

### **5. package.json**
- ✅ Adicionado `cookie-parser@^1.4.6`

---

## 🔓 Logout

```javascript
async function handleLogout() {
    // 1. Limpar localStorage
    clearAuthData();

    // 2. Limpar cookie (servidor faz automaticamente)
    // Server pode fazer: res.clearCookie('token')

    // 3. Redirecionar para login
    window.location.href = '/login.html';
}
```

**Quando é necessário adicionar rota de logout:**
```javascript
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({ success: true, message: 'Deslogado com sucesso' });
});
```

---

## 🎯 Checklist de Segurança

- ✅ Token armazenado em cookie HTTP-only (não acessível via JS)
- ✅ Token enviado como Bearer em requisições API
- ✅ Páginas HTML protegidas por middleware
- ✅ Senha criptografada com bcrypt
- ✅ roles validados (admin/employee)
- ✅ JWT com expiração de 24h
- ✅ SameSite=strict contra CSRF
- ✅ Redirecionamento automático para login se não autenticado
- ⚠️ **TODO em Produção:**
  - [ ] Usar `process.env.JWT_SECRET` (não hardcoded)
  - [ ] Usar HTTPS (`secure: true`)
  - [ ] Adicionar rate limiting no login
  - [ ] Adicionar logs de acesso
  - [ ] Implementar refresh tokens

---

## 🧪 Teste Local

### **Passo 1: Instalar dependências**
```bash
npm install
```

### **Passo 2: Iniciar servidor**
```bash
npm start
# ou
npm run dev  # com hot reload
```

### **Passo 3: Acessar**
```
http://localhost:3000/
```

### **Passo 4: Testar login**
- Username: `admin`
- Password: `admin123` (ou conforme seu banco)

---

## 📞 Suporte

Para dúvidas sobre a implementação, veja:
- [middleware/auth.js](middleware/auth.js) - Middlewares
- [controllers/authController.js](controllers/authController.js) - Lógica de login
- [login.js](login.js) - Frontend do login
- [server.js](server.js) - Rotas protegidas
