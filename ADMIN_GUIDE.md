# 🎨 Interface Admin - Guia de Uso

## 📋 Visão Geral

Sistema de admin profissional e moderno com dashboard completo, CRUD de produtos e métricas em tempo real.

---

## 🎯 Funcionalidades

### 1. **Dashboard com Métricas**
- 📊 Total de produtos
- 📦 Quantidade total em estoque
- 💰 Valor total em estoque
- ⚠️ Produtos com estoque baixo (< 5 unidades)
- 📝 Histórico de últimas alterações

### 2. **Gerenciamento de Produtos**
- ✅ **Criar** novo produto
- ✅ **Ler** lista completa
- ✅ **Editar** produto existente
- ✅ **Deletar** com confirmação

### 3. **Design Moderno**
- 🎨 Sidebar com gradiente elegante
- 📱 Responsivo (desktop, tablet, mobile)
- 🌈 Cores profissionais
- ⚡ Animações suaves
- 🔍 Bustca de produtos em tempo real

### 4. **Funcionalidades Extras**
- 🔒 Autenticação por JWT
- 👤 Informações do usuário (sidebar + header)
- 🚪 Logout seguro
- 🔔 Mensagens de feedback
- ⚙️ Página de configurações

---

## 🚀 Como Usar

### Iniciar o Sistema

```bash
npm start
```

Abra o navegador: **http://localhost:3000**

### Login

Use uma das contas padrão:

```
👤 Admin
   Usuário: admin
   Senha: admin123

👤 Funcionário
   Usuário: funcionario
   Senha: func123
```

---

## 📊 Dashboard

Exibe as 4 métricas principais:

| Métrica | Descrição |
|---------|-----------|
| 📊 Total de Produtos | Quantidade de produtos cadastrados |
| 📦 Quantidade em Estoque | Total de unidades em estoque |
| 💰 Valor Total | Soma de (preço × quantidade) |
| ⚠️ Estoque Baixo | Produtos com quantidade < 5 |

**Últimas Atualizações:**
- Mostra os últimos 5 eventos (criado, editado, deletado)
- Atualizado em tempo real

---

## 📦 Gerenciamento de Produtos

### Ver Produtos

1. Clique em **"📦 Produtos"** no menu
2. Todos os produtos são exibidos em uma tabela

**Colunas da Tabela:**
- **ID** - Identificador único
- **Produto** - Nome do produto
- **Preço** - Preço unitário em R$
- **Estoque** - Quantidade disponível (com ⚠️ se baixo)
- **Valor Total** - Quantidade × Preço
- **Ações** - Editar / Deletar

### Criar Novo Produto

1. Clique no botão **"+ Novo Produto"**
2. Preencha os campos:
   - **Nome do Produto** (obrigatório)
   - **Preço** (obrigatório, mínimo 0.01)
   - **Quantidade** (obrigatório, mínimo 0)
3. Clique em **"Salvar Produto"**

### Editar Produto

1. Clique no botão **"✏️ Editar"** na linha do produto
2. Modal abre com os dados atuais
3. Modifique os campos conforme necessário
4. Clique em **"Salvar Produto"**

### Deletar Produto

1. Clique no botão **"🗑️ Deletar"** na linha do produto
2. Confirme a exclusão no modal
3. Produto será removido permanentemente

---

## 🔍 Busca de Produtos

Na página de Produtos, use a barra de busca:

```
🔍 Buscar produtos...
```

Pesquisa por:
- Nome do produto
- ID do produto

A busca é em tempo real enquanto você digita.

---

## ⚙️ Configurações

### Página de Configurações

Acesse **"⚙️ Configurações"** para:

- ℹ️ Ver informações do sistema
- 🆕 Criar novo usuário (em breve)
- 📥 Exportar dados (em breve)
- 🗑️ Limpar cache

---

## 👤 Perfil do Usuário

### Sidebar (Esquerda)
- Exibe nome do usuário
- Exibe role (Administrador / Funcionário)
- Avatar com emoji

### Header (Topo)
- Nome do usuário + role
- Hora de conexão

### Logout
- Clique em **"Sair"** na sidebar
- Será desconectado e redirecionado para login

---

## 🎨 Design e Layout

### Paleta de Cores

```
Roxo Principal:    #667eea / #764ba2
Azul (Info):       #007bff
Verde (Sucesso):   #28a745
Vermelho (Perigo): #dc3545
Amarelo (Aviso):   #ffc107
Cinza (Neutro):    #6c757d
```

### Componentes Principais

- **Sidebar** - Navegação fixa com gradiente
- **Header** - Informações do usuário e título
- **Métricas** - Cards com ícones e valores
- **Tabela** - Responsiva com actions
- **Modais** - Para criar/editar/deletar
- **Mensagens** - Feedback ao usuário

### Responsividade

**Desktop (> 768px)**
- Sidebar sempre visível
- Conteúdo ao lado

**Tablet (768px)**
- Sidebar pode desaparecer
- Menu toggle visível

**Mobile (< 480px)**
- Sidebar colapsável
- Tabela com scroll horizontal
- Botões em coluna

---

## 🔐 Segurança

### Autenticação
- ✅ JWT Token (24h de validade)
- ✅ Armazenamento seguro em localStorage
- ✅ Validação em cada requisição

### Permissões por Role

| Ação | Admin | Funcionário |
|------|-------|-------------|
| Ver Dashboard | ✅ | ❌ |
| Ver Produtos | ✅ | ✅* |
| Criar Produto | ✅ | ❌ |
| Editar Produto | ✅ | ✅* |
| Deletar Produto | ✅ | ❌ |

*Funcionários veem a interface baseado em permissões do backend

---

## 🐛 Dicas de Uso

### Para Administradores

- Use o dashboard para acompanhar estoque
- Crie novos produtos regularmente
- Monitore produtos com estoque baixo
- Edite preços conforme necessário

### Para Funcionários

- Visualize o estoque disponível
- Edite apenas quantidades de produtos
- Não pode criar ou deletar

### Performance

- Busca em tempo real (filtra 500+ produtos)
- Carregar dashboard é rápido (< 500ms)
- Sem refresh necessário na maioria dos casos

---

## 💾 Dados Armazenados

### No Backend (SQLite)
- Usuários (ID, username, password, role)
- Produtos (ID, name, quantity, price)
- Audit logs (ações realizadas)

### No Frontend (localStorage)
- JWT Token
- Dados do usuário (username, role)
- Histórico local de mudanças

---

## 🔄 Fluxo de Dados

```
1. Usuário faz login
   ↓
2. Backend autentica e retorna JWT + dados
   ↓
3. Frontend armazena token e usuário
   ↓
4. Dashboard carrega produtos do backend
   ↓
5. Métricas são calculadas localmente
   ↓
6. Página atualiza a cada ação (CRUD)
   ↓
7. Mensagens de feedback confirmam ações
```

---

## 🎯 Atalhos do Teclado (Opcional)

Pode ser implementado:
- `Ctrl+N` - Novo produto
- `Ctrl+K` - Buscar
- `Esc` - Fechar modal
- `Ctrl+Shift+L` - Logout

---

## 📱 Visualização em Diferentes Dispositivos

### Desktop (1920px)
- Sidebar + conteúdo lado a lado
- Tabela completa com todas as colunas
- 4 cards de métricas em uma linha

### Tablet (768px)
- Sidebar colapsável
- Tabela com scroll
- 2 cards de métricas por linha

### Mobile (375px)
- Sidebar em drawer/modal
- Tabela com scroll horizontal
- 1 card de métrica por linha
- Botões em coluna

---

## 🚀 Próximas Melhorias

- [ ] Criar novo usuário direto no admin
- [ ] Exportar dados em CSV/PDF
- [ ] Gráficos de tendências
- [ ] Notificações push
- [ ] Sincronização em tempo real
- [ ] Modo escuro
- [ ] Multiidioma

---

## ❓ FAQ

**P: Como resetar a senha?**
R: Entre em contato com o administrador do sistema.

**P: Posso ver dados de outros usuários?**
R: Não, cada usuário vê apenas seus dados e histórico.

**P: Os dados são sincronizados?**
R: Sim, quando você edita, todos usuários logados veem a atualização ao atualizar a página.

**P: Posso usar em celular?**
R: Sim! A interface é 100% responsiva.

**P: Qual navegador usar?**
R: Chrome, Firefox, Safari, Edge - versões recentes.

---

## 📞 Suporte

Para problemas ou sugestões:

1. Verifique a console do navegador (F12)
2. Veja as mensagens de erro
3. Consulte a documentação da API: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

**Sistema Admin criado com ❤️ usando HTML5, CSS3 e JavaScript Vanilla**
