# 🔐 GUIA SÊNIOR - IMPLEMENTAÇÃO DE SEGURANÇA

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Rota Raiz Inteligente**
```javascript
app.get('/', (req, res) => {
    if (req.user) {
        // Usuário autenticado vai direto para seu painel
        return res.redirect(req.user.role === 'admin' ? '/admin.html' : '/employee.html');
    }
    // Novo usuário vai para login
    res.sendFile(path.join(__dirname, 'login.html'));
});
```

**Resultado:**
- ✅ `/` = Tela de login (se não autenticado)
- ✅ `/` = Redireciona para painel (se autenticado)

---

### 2. **Proteção de index.html (CRÍTICO)**
```javascript
app.get('/index.html', protectAdminPage, (req, res) => {
    console.log(`✓ Admin ${req.user.username} acessou /index.html`);
    res.sendFile(path.join(__dirname, 'index.html'));
});
```

**Por que era vulnerável antes:**
- ❌ `index.html` era servido por `app.use(express.static())`
- ❌ Não havia proteção
- ❌ Qualquer um digitava `/index.html` e via o painel

**Como funciona agora:**
- ✅ Requisição passa por `protectAdminPage` PRIMEIRO
- ✅ Se falhar na autenticação → redirect login
- ✅ Se falhar no role check → redirect login com erro
- ✅ Só serve arquivo se passou nos middlewares

---

### 3. **Middlewares de Proteção Reforçados**

#### A. Verify Token from Cookie
```javascript
const verifyTokenFromCookie = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user; // ← Essencial! Torna usuário acessível
        } catch (err) {
            console.log('Token inválido ou expirado:', err.message);
            // req.user fica undefined
        }
    }
    next();
};
```

**Por que é importante:**
- Executa ANTES de qualquer rota
- Decodifica JWT
- Disponibiliza dados do usuário em `req.user`
- Sem este, os middlewares seguintes não funcionam

#### B. Protect Admin Page
```javascript
const protectAdminPage = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.warn(`⚠️ Tentativa não autorizada: ${req.ip}`);
        return res.redirect('/login.html?error=admin_only');
    }
    next();
};
```

**Verifica:**
1. ✅ Existe `req.user`? (token válido)
2. ✅ `req.user.role` é `'admin'`? (permissão correta)
3. ❌ Se falhar → redireciona para login

#### C. Protect Employee Page
```javascript
const protectEmployeePage = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        console.warn(`⚠️ Tentativa não autorizada: ${req.ip}`);
        return res.redirect('/login.html?error=employee_only');
    }
    next();
};
```

**Por que permite admin também:**
- Admin pode acessar tudo
- Employee só acessa sua página

---

## 🛡️ FLUXO DE PROTEÇÃO DETALHADO

### CENÁRIO: Usuário tenta acessar `/admin.html` sem autenticação

```
1. HTTP GET /admin.html (sem cookies)
   ↓
2. Middleware Global: verifyTokenFromCookie
   ├─ req.cookies.token = undefined
   ├─ req.user = undefined ❌
   └─ next()
   ↓
3. Rota: app.get('/admin.html', protectAdminPage, ...)
   ├─ Executa: protectAdminPage middleware
   ├─ Verifica: !req.user → TRUE ❌
   ├─ Log: console.warn('⚠️ Tentativa...')
   ├─ Action: res.redirect('/login.html?error=admin_only')
   └─ PARA AQUI (não chega no handler)
   ↓
4. Navegador redireciona para: /login.html?error=admin_only
   ↓
5. Tela de login é exibida com mensagem ✅
```

### CENÁRIO: Admin autenticado acessa `/admin.html`

```
1. HTTP GET /admin.html (com cookie token)
   ↓
2. Middleware Global: verifyTokenFromCookie
   ├─ req.cookies.token = "eyJhbGciOiJIUzI1NiIs..."
   ├─ jwt.verify() ✅
   ├─ req.user = { id: 1, username: 'admin', role: 'admin', ... }
   └─ next()
   ↓
3. Rota: app.get('/admin.html', protectAdminPage, ...)
   ├─ Executa: protectAdminPage middleware
   ├─ Verifica: !req.user → FALSE ✅
   ├─ Verifica: req.user.role === 'admin' → TRUE ✅
   ├─ Log: console.log('✓ Admin admin acessou /admin.html')
   └─ next() → vai para o handler
   ↓
4. Handler executa:
   ├─ res.sendFile('/admin.html')
   └─ Arquivo é servido ✅
   ↓
5. Admin vê seu painel ✅
```

### CENÁRIO: Employee tenta acessar `/admin.html`

```
1. HTTP GET /admin.html (com token employee)
   ↓
2. Middleware Global: verifyTokenFromCookie
   ├─ req.user = { id: 2, username: 'funcionario', role: 'employee', ... } ✅
   └─ next()
   ↓
3. Rota: app.get('/admin.html', protectAdminPage, ...)
   ├─ Executa: protectAdminPage middleware
   ├─ Verifica: !req.user → FALSE ✅
   ├─ Verifica: req.user.role === 'admin' → FALSE ❌
   ├─ Log: console.warn('⚠️ Tentativa não autorizada: 192.168.x.x')
   ├─ Action: res.redirect('/login.html?error=admin_only')
   └─ PARA AQUI
   ↓
4. Navegador redireciona para: /login.html?error=admin_only
   ↓
5. Tela de login com mensagem de erro ✅
   (Employee não conseguiu acessar admin)
```

---

## 📊 TABELA DE ROTEAMENTO

| URL | Sem Auth | Employee | Admin | POST Dados |
|-----|----------|----------|-------|-----------|
| `/` | ✅ Login | ✅ → /employee.html | ✅ → /admin.html | - |
| `/login.html` | ✅ Login | ✅ → /employee.html | ✅ → /admin.html | - |
| `/index.html` | ❌ Redirect login | ❌ Redirect login | ✅ Admin |  - |
| `/admin.html` | ❌ Redirect login | ❌ Redirect login | ✅ Admin | - |
| `/employee.html` | ❌ Redirect login | ✅ Employee | ✅ Admin | - |
| `/api/auth/login` | ✅ POST | ✅ POST | ✅ POST | username, password |
| `/api/auth/logout` | ✅ POST | ✅ POST | ✅ POST | - |
| `/api/products` | ❌ 401 | ✅ GET, PUT | ✅ GET, POST, PUT, DELETE | - |
| `/*` (404) | ❌ Redirect login | ✅ 404 JSON | ✅ 404 JSON | - |

---

## 🧪 TESTES DE SEGURANÇA

### Teste 1: Acesso não autenticado
```
1. Arquivo: ./test-security.md
2. Abra: http://localhost:3000/admin.html
3. Esperado: Redireciona para /login.html?error=admin_only
4. Resultado: ✅ PASSOU
```

### Teste 2: Employee bypassa autorização
```
1. Faça login como: funcionario / func123
2. Tente acessar: http://localhost:3000/admin.html
3. Esperado: Redireciona para /login.html?error=admin_only
4. Resultado: ✅ PASSOU
```

### Teste 3: Admin acessa seu painel
```
1. Faça login como: admin / admin123
2. Acesse: http://localhost:3000/admin.html
3. Esperado: Admin painel é exibido
4. Resultado: ✅ PASSOU
```

### Teste 4: Smart redirect na raiz
```
1. Sem autenticação → http://localhost:3000/
2. Esperado: Tela de login
3. Resultado: ✅ PASSOU

4. Login como admin → http://localhost:3000/
5. Esperado: Redireciona para /admin.html
6. Resultado: ✅ PASSOU
```

### Teste 5: Logout limpa cookies
```
1. Admin logado
2. Clique em "Sair"
3. Tente acessar: http://localhost:3000/admin.html
4. Esperado: Redireciona para login (cookie foi removido)
5. Resultado: ✅ PASSOU
```

---

## 🔍 LOGS DE SEGURANÇA

Quando implantado, você verá no console:

### Tentativas legítimas:
```
✓ Admin admin acessou /admin.html
✓ Usuário funcionario (employee) acessou /employee.html
✓ Usuário admin redirecionado do login para seu painel
```

### Tentativas suspeitas:
```
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
⚠️ Tentativa de acesso a arquivo protegido sem autenticação: /admin.html
⚠️ Página não encontrada: /xpto para usuário admin
```

---

## 🎯 CHECKLIST FINAL

- [x] Rota `/` serve login.html public
- [x] Rota `/` redireciona se autenticado
- [x] `/admin.html` protegido com `protectAdminPage`
- [x] `/employee.html` protegido com `protectEmployeePage`
- [x] `/index.html` protegido com `protectAdminPage`
- [x] Token verificado em CADA requisição
- [x] Role verificado para páginas sensíveis
- [x] Logs de segurança implementados
- [x] Redirecorr de 404 para login
- [x] Cookie HTTP-Only (XSS safe)
- [x] CSRF protection (sameSite: strict)
- [x] Token expiration (24h)

---

## 💡 CONCEITOS-CHAVE PARA LEMBRAR

### 1. **Defense in Depth**
Múltiplas camadas de proteção, não apenas uma.

### 2. **Fail Secure**
Se algo falha, o padrão é NEGAR acesso.

### 3. **Least Privilege**
User só acessa o que precisa (admin ≠ employee).

### 4. **Separation of Concerns**
- Autenticação (token valido)
- Autorização (role correto)
- Auditoria (logs)

### 5. **Never Trust the Client**
- Não confia em cookies manipulados
- Não confia em localStorage
- Sempre valida no servidor

---

## 📚 REFERÊNCIAS NO CÓDIGO

- [server.js](server.js) - Rotas protegidas
- [middleware/auth.js](middleware/auth.js) - Middlewares
- [controllers/authController.js](controllers/authController.js) - JWT
- [SECURITY_LAYERS_EXPLAINED.md](SECURITY_LAYERS_EXPLAINED.md) - Detalhes técnicos
