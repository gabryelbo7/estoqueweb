# 📊 LOGS DE SEGURANÇA - EXEMPLOS PRÁTICOS

## 🟢 OPERAÇÕES LEGÍTIMAS (Esperadas)

### Exemplo 1: Login bem-sucedido
```
[2026-04-07T23:45:12.123Z] POST /api/auth/login - 200 (142ms)
✓ Usuário admin criado: admin / admin123 (admin, store_id: 1)
```

### Exemplo 2: Admin acessando seu painel
```
[2026-04-07T23:45:45.456Z] GET /admin.html - 200 (15ms)
✓ Admin admin acessou /admin.html
```

### Exemplo 3: Funcionário acessando seu painel
```
[2026-04-07T23:46:00.789Z] GET /employee.html - 200 (12ms)
✓ Usuário funcionario (employee) acessou /employee.html
```

### Exemplo 4: Redirecionamento inteligente na raiz
```
[2026-04-07T23:46:30.321Z] GET / - 302 (8ms)
✓ Usuário admin redirecionado do login para seu painel
```

### Exemplo 5: Logout
```
[2026-04-07T23:47:00.654Z] POST /api/auth/logout - 200 (5ms)
✓ Dados de autenticação removidos do localStorage
```

---

## 🔴 TENTATIVAS BLOQUEADAS (Segurança Ativa)

### Tentativa 1: Acesso sem autenticação (mais comum)
```
[2026-04-07T23:48:00.111Z] GET /admin.html - 302 (10ms)
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
Resposta: redirect('/login.html?error=admin_only')
```

### Tentativa 2: Employee tenta acessar admin
```
[2026-04-07T23:48:30.222Z] GET /admin.html - 302 (8ms)
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
Resposta: redirect('/login.html?error=admin_only')
```

### Tentativa 3: Acessar index.html sem autenticação
```
[2026-04-07T23:49:00.333Z] GET /index.html - 302 (9ms)
⚠️ Tentativa de acesso a arquivo protegido sem autenticação: /index.html
Resposta: redirect('/login.html?error=admin_only')
```

### Tentativa 4: Token expirado
```
[2026-04-07T23:50:00.444Z] GET /employee.html - 302 (7ms)
Token inválido ou expirado: TokenExpiredError: jwt expired
⚠️ Tentativa de acesso não autorizado a recurso employee: 192.168.1.100
Resposta: redirect('/login.html?error=employee_only')
```

### Tentativa 5: Página que não existe (não autenticado)
```
[2026-04-07T23:51:00.555Z] GET /pagina-inexistente - 302 (6ms)
⚠️ Tentativa de acesso a rota inexistente sem autenticação: /pagina-inexistente
Resposta: redirect('/login.html')
```

### Tentativa 6: Página que não existe (autenticado)
```
[2026-04-07T23:52:00.666Z] GET /pagina-inexistente - 404 (5ms)
⚠️ Página não encontrada: /pagina-inexistente para usuário admin
Resposta: JSON { error: 'Página não encontrada' }
```

---

## 📋 DECODIFICAÇÃO DE LOGS

### Formato Standard do Express
```
[TIMESTAMP] METHOD PATH - STATUS (DURATIONms)
[2026-04-07T23:45:12.123Z] GET /admin.html - 200 (15ms)
                           ↓   ↓              ↓   ↓
                        Ação Rota        Sucesso Tempo
```

### Seu Projeto Adiciona
```
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
↑  Nível de severidade (aviso)
↓
   Tipo de erro
   ↓
      Qual recurso
      ↓
         IP do cliente (para investigação)
```

---

## 🔍 ANÁLISE DE LOGS PARA SEGURANÇA

### Cenário: Ataque por força bruta

Se você ver muitas linhas como:
```
⚠️ Tentativa de acesso não autorizado: 203.0.113.45 (repetidas 50x)
```

**Ações:**
1. ✅ Seu sistema bloqueou corretamente
2. ⚠️ Investigue o IP `203.0.113.45`
3. 🛡️ Implemente rate limiting (no futuro)
4. 📊 Log centralizado para alertas

### Cenário: Employee legítimo tenta admin por engano

Se você ver uma ou duas linhas:
```
⚠️ Tentativa de acesso não autorizado a recurso admin: 192.168.1.100
```

**Análise:**
1. ✅ Sistema funcionado corretamente
2. ✅ Usuário foi redirecionado para login
3. 📝 Pode ser engano do user
4. ✅ Sem ação necessária

### Cenário: Alguém alterou o cookie

Se você ver erros como:
```
Token inválido ou expirado: JsonWebTokenError: invalid signature
⚠️ Tentativa de acesso não autorizado: 192.168.1.100
```

**Análise:**
1. ✅ Assinatura JWT foi rejeitada
2. ✅ Tentativa de tampering detectada
3. 🛡️ Sistema bloqueou automaticamente
4. ⚠️ Monitore este IP

---

## 📈 PADRÕES ESPERADOS EM OPERAÇÃO NORMAL

### Dia normal de trabalho

```
// Manhã: Vários admins fazendo login
[2026-04-08T08:00:00.000Z] POST /api/auth/login - 200 (145ms)
[2026-04-08T08:01:30.000Z] POST /api/auth/login - 200 (138ms)
[2026-04-08T08:03:00.000Z] POST /api/auth/login - 200 (142ms)

// Users acessando seus dashboards
[2026-04-08T08:05:00.000Z] GET /admin.html - 200 (12ms)
✓ Admin user1 acessou /admin.html

[2026-04-08T08:05:15.000Z] GET /employee.html - 200 (10ms)
✓ Usuário funcionario2 (employee) acessou /employee.html

// Operações normais (API calls)
[2026-04-08T08:10:00.000Z] GET /api/products - 200 (45ms)
[2026-04-08T08:15:00.000Z] POST /api/products - 200 (78ms)
[2026-04-08T08:20:00.000Z] PUT /api/products/5 - 200 (52ms)

// Final do dia: Logout
[2026-04-08T17:00:00.000Z] POST /api/auth/logout - 200 (8ms)
[2026-04-08T17:02:00.000Z] POST /api/auth/logout - 200 (7ms)
```

**Observação:** Logs limpos, sem avisos (✅ Segurança OK)

---

### Tentativa de ataque detectada

```
// Normal...
[2026-04-08T14:30:00.000Z] GET /admin.html - 200 (12ms)

// Ataque começa (alguém tenta vários paths)
[2026-04-08T14:30:05.000Z] GET /admin.html - 302 (9ms)
⚠️ Tentativa de acesso não autorizado: 203.0.113.42

[2026-04-08T14:30:06.000Z] GET /employee.html - 302 (8ms)
⚠️ Tentativa de acesso não autorizado: 203.0.113.42

[2026-04-08T14:30:07.000Z] GET /index.html - 302 (7ms)
⚠️ Tentativa de acesso a arquivo protegido: 203.0.113.42

[2026-04-08T14:30:08.000Z] GET /dashboard - 302 (6ms)
⚠️ Tentativa de acesso a rota inexistente: 203.0.113.42

// Alerta: múltiplas tentativas do mesmo IP em 4 segundos!
⚠️ POSSÍVEL ATAQUE: IP 203.0.113.42 fez 4 tentativas em 4 segundos
```

**Ação:** Investigar e considerar bloquear IP

---

## 🎯 CHECKLIST: O QUE OBSERVAR

- [ ] Logins bem-sucedidos → status 200
- [ ] Acessos bloqueados → status 302 + aviso
- [ ] Sem erros de token em operação normal
- [ ] Erros de token apenas após expiração (24h)
- [ ] Múltiplas tentativas do mesmo IP = suspeita
- [ ] Admin logs diferem de employee logs (roles separados)
- [ ] Timestamps em ordem cronológica

---

## 💾 ONDE SALVAR LOGS (Produção)

```javascript
// Em produção, redirecione logs para arquivo:
const fs = require('fs');
const logStream = fs.createWriteStream('security.log', { flags: 'a' });

// Exemplo:
logStream.write(`[${new Date().toISOString()}] ⚠️ Tentativa não autorizada: ${req.ip}\n`);
```

---

## 📚 REFERÊNCIA RÁPIDA DE STATUS CODES

| Status | Significado | Exemplo |
|--------|------------|---------|
| 200 | OK (sucesso) | Admin acessou painel |
| 302 | Redirect (segurança) | Redirecionado para login |
| 401 | Não autenticado | Sem token |
| 403 | Proibido (role) | Employee vs Admin |
| 404 | Não encontrado | Rota inexistente |
| 500 | Erro do servidor | Bug no código |

Na sua aplicação:
- **200** = ✅ Permitido
- **302** = ⚠️ Bloqueado (redirect)
- **404** = ⚠️ Página não existe
