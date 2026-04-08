# 🎓 GUIA EDUCACIONAL - COMO A SEGURANÇA FUNCIONA

## 🌟 RESUMO EM 60 SEGUNDOS

**Problema:** Qualquer um poderia acessar `/admin.html` digitando na URL, sem fazer login.

**Solução:** Adicionar verificação de autenticação e autorização ANTES de servir o arquivo.

**Resultado:** Apenas usuários autenticados com role correto conseguem acessar.

---

## 📚 CONCEITOS FUNDAMENTAIS

### 1. Autenticação vs Autorização

**Autenticação** = "Você é quem diz ser?"
- Verifica se possui token válido
- Token prova que fez login
- Middleware: `verifyTokenFromCookie`

**Autorização** = "Você tem permissão para isso?"
- Verifica se seu role permite acesso
- Admin ≠ Employee
- Middleware: `protectAdminPage`, `protectEmployeePage`

### 2. JWT (JSON Web Token)

```
Estrutura do Token:
┌─────────┬─────────────┬───────────────┐
│ Header  │   Payload   │   Signature   │
├─────────┼─────────────┼───────────────┤
│ {"alg"} │ {"id": 1}   │ base64url()   │
│ type    │ {"role"}    │ with secre    │
│         │ {"username"}│ key           │
└─────────┴─────────────┴───────────────┘

No seu servidor:
jwt.sign(payload, JWT_SECRET) → token
jwt.verify(token, JWT_SECRET) → payload (se válido)
```

**Por que é seguro:**
- ❌ Não pode modificar payload (signature fails)
- ❌ Não pode forjar token (precisa da chave secreta)
- ✅ Servidor valida em cada requisição

### 3. Middlewares (Camadas)

Um middleware é uma função que:
1. Recebe requisição (req)
2. Processa algo
3. Chama next() para continuar OU responde

```javascript
const middleware = (req, res, next) => {
    // Fazer verificação
    if (condiçãoOK) {
        next(); // → Vai para próximo middleware/handler
    } else {
        res.redirect('/erro'); // → Para aqui
    }
};

app.get('/protegido', middleware, (req, res) => {
    // Só chega aqui se middleware chamou next()
    res.send('Conteúdo protegido');
});
```

---

## 🔐 ARQUITETURA DE SEGURANÇA

### Camada 1: Verificação Global de Token

```javascript
// Executa em TODAS as requisições
app.use(verifyTokenFromCookie);

const verifyTokenFromCookie = (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            // Decodifica e valida
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user; // ← Isso permite acessar dados do usuário depois!
        } catch (err) {
            console.log('Token inválido');
            // req.user fica undefined
        }
    }
    next(); // Continua mesmo se sem token
};
```

**Resultado:**
- Se tem token válido → `req.user` = dados do usuário
- Se sem token → `req.user` = undefined
- Se token expirado → `req.user` = undefined

### Camada 2: Verificação por Rota

```javascript
// Só para /admin.html
const protectAdminPage = (req, res, next) => {
    // Verificação 1: Token existe?
    if (!req.user) {
        return res.redirect('/login.html?error=admin_only');
    }
    
    // Verificação 2: Role é admin?
    if (req.user.role !== 'admin') {
        return res.redirect('/login.html?error=admin_only');
    }
    
    // Passou em tudo
    next();
};

// Aplicar na rota
app.get('/admin.html', protectAdminPage, (req, res) => {
    res.sendFile('./admin.html');
});
```

**Fluxo:**
```
Requisição HTTP
    ↓
Camada Global: verifyTokenFromCookie (decodifica token)
    ↓
Camada Rota: protectAdminPage (verifica role)
    ↓
[VáriosResultados] 
    ↓
 Sem token?    → Redirect login
 Token expirado? → req.user undefined → Redirect login

 Tem token?
   role = admin? → Continua (next()) → Serve arquivo ✅
   role ≠ admin? → Redirect login ❌
```

---

## 🎯 EXEMPLOS PRÁTICOS

### Cenário 1: Usuário sem login

```
Cliente → GET /admin.html (sem cookies)
            ↓
Servidor: verifyTokenFromCookie
          req.cookies.token = undefined
          req.user = undefined
            ↓
Servidor: protectAdminPage
          !req.user = TRUE
          return res.redirect('/login.html?error=admin_only')
            ↓
Cliente recebe: 302 Found
                Location: /login.html?error=admin_only
            ↓
Browser redireciona para login ✅
```

**Logs:**
```
[2026-04-08T10:30:00] GET /admin.html - 302 (9ms)
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
```

### Cenário 2: Employee tentando admin

```
Cliente → GET /admin.html (com token employee)
            ↓
Servidor: verifyTokenFromCookie
          jwt.verify(token, SECRET) ✅
          req.user = { id: 2, username: 'func1', role: 'employee' }
            ↓
Servidor: protectAdminPage
          req.user exists ✅
          req.user.role === 'admin'? FALSE ❌
          return res.redirect('/login.html?error=admin_only')
            ↓
Cliente recebe: 302 Found
                Location: /login.html?error=admin_only
            ↓
Browser redireciona para login ✅
```

**Logs:**
```
[2026-04-08T10:35:00] GET /admin.html - 302 (8ms)
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
```

### Cenário 3: Admin correto

```
Cliente → GET /admin.html (com token admin)
            ↓
Servidor: verifyTokenFromCookie
          jwt.verify(token, SECRET) ✅
          req.user = { id: 1, username: 'admin', role: 'admin' }
            ↓
Servidor: protectAdminPage
          req.user exists ✅
          req.user.role === 'admin'? TRUE ✅
          next() → vai para handler
            ↓
Servidor: Handler (res.sendFile('./admin.html'))
            ↓
Cliente recebe: 200 OK
                [HTML content do admin]
            ↓
Browser exibe painel admin ✅
```

**Logs:**
```
[2026-04-08T10:40:00] GET /admin.html - 200 (15ms)
✓ Admin admin acessou /admin.html
```

---

## 🛡️ POR QUE NÃO DÁ PARA BURLAR

### Tentativa 1: Modificar Cookie

```
Cliente tenta alterar:
role: 'employee' → role: 'admin' (manualmente)
            ↓
jwt.verify() tenta validar
            ↓
Signature NÃO bate (precisa da chave secreta)
            ↓
jwt.verify() retorna ERRO
            ↓
req.user = undefined
            ↓
protectAdminPage bloqueia ✅
```

### Tentativa 2: Forjar Token

```
Cliente tenta criar novo token com role admin
            ↓
Precisa da JWT_SECRET
            ↓
JWT_SECRET está APENAS no servidor
            ↓
Cliente não consegue criar token válido
            ↓
jwt.verify() falha
            ↓
Bloqueado ✅
```

### Tentativa 3: Usar Token de Outro User

```
Cliente tira token de outro user
            ↓
Token é válido (assinado com SECRET)
            ↓
jwt.verify() decodifica OK
            ↓
req.user = dados do outro usuário
            ↓
protectAdminPage verifica role
            ↓
Se outro user é employee → BLOQUEADO ✅
Se outro user é admin → Problema! (múltiplos admins é OK)
```

---

## 📊 TABELA DE DECISÃO

```
Token      Role       Resultado
Existe?    Admin?     
───────────────────────────────────────────
NÃO        -          ❌ BLOQUEADO (sem autenticação)
SIM        NÃO        ❌ BLOQUEADO (sem autorização)
SIM        SIM        ✅ PERMITIDO
```

---

## 🔍 COMO DEBUGAR

### Debug 1: Token não está sendo reconhecido

```javascript
// No middleware, adicione:
console.log('Token:', req.cookies.token);
console.log('Decoded:', req.user);
```

**Possíveis problemas:**
- ❌ Cookie não está sendo enviado pelo cliente
- ❌ Cookie foi deletado (logout)
- ❌ Token expirou (24 horas)

### Debug 2: Acesso bloqueado incorretamente

```javascript
// Verifique logs:
console.log('req.user:', req.user);
console.log('role:', req.user?.role);
console.log('is admin?', req.user?.role === 'admin');
```

**Possíveis problemas:**
- ❌ Role tem espaços em branco
- ❌ Role tem case différente ('Admin' vs 'admin')
- ❌ req.user é null/undefined

### Debug 3: Redirecionamento não funciona

```javascript
// Verifique:
res.redirect('/login.html?error=admin_only');
// Vs
res.redirect('login.html?error=admin_only');
// (primeira barra é importante)
```

---

## 🎓 LIÇÕES DE SEGURANÇA

### Lição 1: Nunca confia no cliente
```javascript
// ❌ ERRADO: Confiar no frontend
if (user.role === 'admin') { /* serve arquivo */ }

// ✅ CORRETO: Verificar no servidor
if (req.user?.role === 'admin') { /* serve arquivo */ }
```

### Lição 2: Múltiplas camadas
```
Não confie em uma camada só!

❌ Apenas checar cookie
❌ Apenas checar role
✅ Checar token + role + expiração + logging
```

### Lição 3: Falhe de forma segura
```javascript
// ❌ ERRADO: Servir algo se erro
try {
    res.sendFile('./admin.html');
} catch(e) {
    res.sendFile('./admin.html'); // ❌ Ops!
}

// ✅ CORRETO: Bloquear por padrão
if (!authorized) {
    return res.redirect('/login.html');
}
res.sendFile('./admin.html');
```

### Lição 4: Audite
```javascript
// ✅ Registre tentativas de acesso não autorizado
console.warn(`⚠️ Tentativa não autorizada: ${req.ip}`);
```

---

## 🚀 PRÓXIMOS PASSOS

### Melhorias Futuras
1. **Rate Limiting** - Limitar tentativas de login
2. **2FA** - Autenticação de dois fatores
3. **Sessions** - Gerenciar múltiplas abas
4. **HTTPS** - Criptografia em trânsito
5. **CSP Headers** - Content Security Policy

### Em Produção
```javascript
// Adicione headers de segurança
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
```

---

## 💡 RESUMO FINAL

### Antes (Inseguro)
```
Usuário → http://localhost:3000/admin.html
       ↓
   [NO MIDDLEWARE]
       ↓
Arquivo servido ❌
```

### Depois (Seguro)
```
Usuário → http://localhost:3000/admin.html
       ↓
verifyTokenFromCookie (decodifica)
       ↓
protectAdminPage (verifica)
       ↓
[Decisão]
├─ Sem token? → Redirect login ✅
├─ Role inválido? → Redirect login ✅
└─ Tudo OK? → Serve arquivo ✅
```

**Conclusão:** Agora o sistema é seguro porque:
1. ✅ Verifica autenticação EM CADA REQUISIÇÃO
2. ✅ Verifica autorização (role)
3. ✅ Bloqueia por padrão (fail secure)
4. ✅ Registra tentativas (auditoria)
5. ✅ Usa JWT (impossível forjar)
