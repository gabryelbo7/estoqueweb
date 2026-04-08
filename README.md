# 🛒 Sistema de Controle de Estoque com JWT

Um sistema completo de controle de estoque com autenticação segura usando JWT (JSON Web Tokens) em Node.js.

## ✨ Funcionalidades

✅ **Autenticação com JWT**
- Sistema de login seguro
- Registro de novos usuários
- Tokens com expiração de 24 horas

✅ **Sistema de Roles (Permissões)**
- **Admin**: Acesso total (criar, editar, deletar produtos)
- **Funcionário**: Acesso parcial (visualizar, editar quantidade)

✅ **Gerenciamento de Produtos**
- Criar, listar, atualizar e deletar produtos
- Controle de quantidade e preço
- Proteção de rotas por role

✅ **Interface Responsiva**
- Login intuitivo
- Dashboard com tabela de produtos
- Mensagens de feedback em tempo real

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js 16+ instalado
- npm ou yarn
- Navegador moderno

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
```

Ou em modo desenvolvimento com auto-reload:

```bash
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

---

## 📝 Credenciais Padrão

| Usuário | Senha | Role |
|---------|-------|------|
| `admin` | `admin123` | Admin |
| `funcionario` | `func123` | Employee |

---

## 📁 Estrutura do Projeto

```
estoque/
├── index.html                    # Interface frontend
├── script.js                     # Lógica do cliente
├── style.css                     # Estilos
├── server.js                     # Servidor Express
├── database.js                   # Inicialização do banco de dados
├── estoque.db                    # Banco de dados SQLite
├── package.json                  # Dependências do projeto
├── API_DOCUMENTATION.md          # Documentação completa da API
├── API_TEST_EXAMPLES.js          # Exemplos de teste da API
├── controllers/
│   ├── authController.js         # Controlador de autenticação
│   ├── dashboardController.js    # Controlador do dashboard
│   └── productController.js      # Controlador de produtos
├── middleware/
│   └── auth.js                   # Middlewares de autenticação
└── routes/
    ├── authRoutes.js             # Rotas de autenticação
    ├── dashboardRoutes.js        # Rotas do dashboard
    └── productRoutes.js          # Rotas de produtos
```

---

## 🔐 Fluxo de Autenticação

1. **Login**
   ```
   POST /api/auth/login
   { "username": "admin", "password": "admin123" }
   ↓ Retorna JWT token
   ```

2. **Armazenar Token**
   ```javascript
   localStorage.setItem('token', response.token);
   ```

3. **Usar Token em Requisições**
   ```
   GET /api/products
   Header: Authorization: Bearer <seu_token_jwt>
   ```

4. **Validação no Middleware**
   ```
   middleware/auth.js valida o token
   ↓ Extrai dados do usuário (id, username, role)
   ↓ Verifica permissões (requireAdmin, requireEmployee)
   ```

---

## 📡 API Endpoints

### Autenticação

- `POST /api/auth/login` - Fazer login
- `POST /api/auth/register` - Registrar novo usuário

### Produtos (Protegido)

- `GET /api/products` - Listar todos os produtos
- `POST /api/products` - Criar novo produto (⚠️ Admin apenas)
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto (⚠️ Admin apenas)

Para mais detalhes, veja [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## 🧪 Testando a API

### Via Frontend

1. Abra http://localhost:3000
2. Faça login com as credenciais padrão
3. Teste as operações

### Via cURL

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Copie o token retornado e use nos próximos comandos

# 3. Listar produtos
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN_JWT"

# 4. Criar produto
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Monitor 24\"","quantity":10,"price":599.90}'
```

### Via Console do Navegador

1. Abra o console (F12 → Console)
2. Copie o código de [API_TEST_EXAMPLES.js](API_TEST_EXAMPLES.js)
3. Execute: `testAuthAPI()`

---

## 🔑 Configuração de Produção

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
JWT_SECRET=seu_segredo_super_seguro_aqui_minimo_32_caracteres
PORT=3000
NODE_ENV=production
DATABASE_PATH=./estoque.db
```

### Segurança

- ✅ Senhas são hasheadas com bcryptjs (10 rounds)
- ✅ JWTs são assinados com segredo forte
- ✅ Tokens expiram em 24h
- ✅ Validação de input em todos os endpoints

---

## 🐛 Troubleshooting

### "Erro ao conectar ao banco de dados"

Verifique se a pasta do projeto tem permissões de escrita.

### "Token inválido ou expirado"

- Verifique se o token está sendo enviado corretamente
- Token expira em 24h, faça login novamente

### "Acesso negado. Requer privilégios de administrador"

Você está usando uma conta de funcionário. Use a conta admin para executar essa ação.

### Porta 3000 já está em uso

Mude a porta no `server.js` ou mata o processo:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

---

## 📚 Tecnologias Utilizadas

- **Backend**: Express.js, Node.js
- **Autenticação**: JWT (jsonwebtoken), bcryptjs
- **Banco de Dados**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Segurança**: CORS, validação de input, hash de senhas

---

## 📄 Licença

ISC

---

## 💡 Próximos Passos

- [ ] Implementar refresh token
- [ ] Adicionar 2FA (autenticação de dois fatores)
- [ ] Criar dashboard com gráficos
- [ ] Implementar filtros e busca avançada
- [ ] Adicionar notificações de estoque baixo
- [ ] Exportar dados em PDF

---

## 📞 Suporte

Para dúvidas ou problemas, consulte a [documentação da API](API_DOCUMENTATION.md) ou os [exemplos de teste](API_TEST_EXAMPLES.js).

---

**Desenvolvido com ❤️ usando Node.js e JWT**
