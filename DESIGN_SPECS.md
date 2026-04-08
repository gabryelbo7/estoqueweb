# 🎨 Interface Admin - Estrutura Visual

## Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│ ☰  Dashboard                                   admin (Admin) │  ← TOP HEADER
├─────────────────┬───────────────────────────────────────────┤
│                 │                                           │
│  SIDEBAR        │            CONTEÚDO PRINCIPAL             │
│  ────────       │                                           │
│                 │  ┌─────────────────────────────────────┐  │
│  📊 Dashboard   │  │ DASHBOARD COM MÉTRICAS              │  │
│  📦 Produtos    │  │ ┌────────┐ ┌────────┐ ┌────────┐   │  │
│  ⚙️  Config     │  │ │ 📊   0 │ │ 📦   0 │ │ 💰 0  │   │  │
│                 │  │ │ Prods  │ │ Estque │ │ Valor │   │  │
│                 │  │ └────────┘ └────────┘ └────────┘   │  │
│  ─────────────  │  │                                     │  │
│  👤 Admin       │  │ ┌─────────────────────────────────┐ │  │
│  Administrador  │  │ │ Últimas Atualizações            │ │  │
│                 │  │ │ • Criado - Produto X - 10:30    │ │  │
│  [Sair]         │  │ │ • Editado - Produto Y - 09:45   │ │  │
│                 │  │ └─────────────────────────────────┘ │  │
│                 │  └─────────────────────────────────────┘  │
│                 │                                           │
└─────────────────┴───────────────────────────────────────────┘
```

---

## Paleta de Cores

### Primárias
```
Gradiente Principal (Sidebar):
  ┌─────────────────────────┐
  │ #667eea (Roxo)          │  ← Topo
  │     ↓↓↓↓↓↓↓↓↓↓          │
  │ #764ba2 (Roxo Escuro)   │  ← Base
  └─────────────────────────┘

Destaques:
  🔵 #007bff - Azul (Primary)
  🟢 #28a745 - Verde (Success)
  🔴 #dc3545 - Vermelho (Danger)
  🟡 #ffc107 - Amarelo (Warning)
  🔷 #17a2b8 - Azul Claro (Info)
  ⚪ #ffffff - Branco (Background cards)
  ⬜ #f8f9fa - Cinzenta Claro (Background page)
```

---

## Página: DASHBOARD

```
┌────────────────────────────────────────────────────────────────┐
│ MÉTRICAS                                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│ │ 📊          │ │ 📦          │ │ 💰          │ │ ⚠️     │ │
│ │ Total       │ │ Quantidade  │ │ Valor Total │ │ Baixo  │ │
│ │ 42          │ │ 1.234       │ │ R$ 45.690   │ │ 3      │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
│                                                                │
│ ÚLTIMAS ATUALIZAÇÕES                                           │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ Criado - Mouse Logitech USB - 10:30                    │ │
│ │ ✏️  Editado - Teclado Mecânico - 09:45                    │ │
│ │ 🗑️  Deletado - Monitor Velho - 09:15                     │ │
│ │ ✅ Criado - Webcam HD - 08:50                            │ │
│ │ ✏️  Editado - SSD Samsung - 08:20                        │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Página: PRODUTOS

```
┌────────────────────────────────────────────────────────────────┐
│ 🔍 Buscar produtos...           [+ Novo Produto]               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────┬──────────────────┬────────┬────────┬──────────┬────┐  │
│ │ ID   │ Produto          │ Preço  │ Estoque│ Valor $  │Ações  │
│ ├──────┼──────────────────┼────────┼────────┼──────────┼────┤  │
│ │ 1    │ Teclado USB      │ 89,90  │ 50     │ 4.495,00 │ ✏️ 🗑️ │  │
│ │ 2    │ Mouse Óptico     │ 45,00  │ 2 ⚠️   │ 90,00    │ ✏️ 🗑️ │  │
│ │ 3    │ Monitor 24"      │ 599,90 │ 0 ⚠️   │ 0,00     │ ✏️ 🗑️ │  │
│ │ 4    │ Cabo HDMI        │ 25,50  │ 120    │ 3.060,00 │ ✏️ 🗑️ │  │
│ │ 5    │ SSD 240GB        │ 189,90 │ 8      │ 1.519,20 │ ✏️ 🗑️ │  │
│ └──────┴──────────────────┴────────┴────────┴──────────┴────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Cores da Tabela:**
- Linha normal: Fundo branco
- Linha hover: Fundo cinza claro
- Estoque baixo (< 5): Fundo amarelo `#fff3cd`

---

## Modal: NOVO/EDITAR PRODUTO

```
┌─────────────────────────────────────────┐
│ Novo Produto                        ✕   │  ← Modal Header
├─────────────────────────────────────────┤
│                                         │
│ Nome do Produto *                       │
│ ┌─────────────────────────────────────┐ │
│ │ Ex: Teclado USB                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Preço (R$) *        Quantidade *        │
│ ┌────────────────┐  ┌────────────────┐  │
│ │ 0.00           │  │ 0              │  │
│ └────────────────┘  └────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ [Cancelar]          [Salvar Produto]    │
└─────────────────────────────────────────┘
```

**Estados:**
- Campo vazio: Border cinza
- Campo focus: Border azul + sombra azul suave
- Botão hover: Eleva(-2px) + sombra

---

## Modal: CONFIRMAR EXCLUSÃO

```
┌─────────────────────────────────────────┐
│ Confirmar Exclusão                  ✕   │
├─────────────────────────────────────────┤
│                                         │
│ Tem certeza que deseja excluir          │
│ "Teclado USB"?                          │
│                                         │
│ ⚠️  Esta ação não pode ser desfeita.    │
│                                         │
├─────────────────────────────────────────┤
│ [Cancelar]   [🗑️ Excluir Produto]      │
└─────────────────────────────────────────┘
```

---

## Componentes Reutilizáveis

### Botão Primary (Azul)
```
[+ Novo Produto]  ← Hover: Eleva-se + ombra
```

### Botão Secondary (Cinza)
```
[Cancelar]  ← Hover: Fica mais escuro
```

### Botão Danger (Vermelho)
```
[🗑️ Deletar]  ← Hover: Fica vermelho escuro
```

### Botão Action (Pequeno)
```
✏️ Editar   🗑️ Deletar
```

### Card de Métrica
```
┌──────────────────┐
│ 📊               │  ← Ícone grande
│                  │
│ Total de Produtos│  ← Label
│ 42               │  ← Valor grande
└──────────────────┘
  ↑
  Left border colorido (azul, verde, etc)
```

### Mensagem de Feedback
```
┌──────────────────────────────────────┐
│ ✅ Produto adicionado com sucesso!   │  ← Verde
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ❌ Erro ao salvar produto             │  ← Vermelho
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ⚠️  Estoque de mouse está baixo      │  ← Amarelo
└──────────────────────────────────────┘
```

---

## Animações

### Entrada de Página
```
Fade In (opacity 0 → 1)
Duração: 300ms
Timing: ease-in-out
```

### Hover em Métrica
```
Sobe: translateY(-5px)
Ombra: Média → Grande
Duração: 300ms
```

### Hover em Botão
```
Sobe: translateY(-2px)
Ombra: Pequena → Média
Duração: 150ms
```

### Mensagem de Feedback
```
Slide Down (translateY -100% → 0)
Fade In (opacity 0 → 1)
Duração: 300ms
Auto-hide: 4 segundos
```

### Modal Aparece
```
Slide Up (translateY +50px → 0)
Fade In (opacity 0 → 1)
Duração: 300ms
```

---

## Responsividade

### Desktop (> 1200px)
```
┌─────────┬────────────────────────────┐
│         │                            │
│ Sidebar │   Conteúdo (90%)           │
│ Fixo    │                            │
│         │  4 Colunas / linha         │
│         │  Tabela completa           │
│         │                            │
└─────────┴────────────────────────────┘
```

### Tablet (768px - 1200px)
```
┌─────────┬────────────────────────────┐
│ Sidebar │   Conteúdo (85%)           │
│ (reduz) │                            │
│         │  2-3 Colunas / linha       │
│         │  Tabela com scroll         │
└─────────┴────────────────────────────┘
```

### Mobile (< 768px)
```
┌════════════════════════════════════┐
│ ☰  Dashboard                       │
├════════════════════════════════════┤
│                                    │
│ Sidebar desaparece (drawer)        │
│                                    │
│ 1 Coluna / linha                   │
│                                    │
│ Tabela com scroll horizontal       │
│                                    │
└════════════════════════════════════┘
```

---

## Fluxo de Navegação

```
Login Page
    ↓
    ├→ [Admin] → Dashboard
    │             ├→ Produtos
    │             └→ Configurações
    │
    └→ [Funcionário] → (Acesso limitado)
```

---

## Cores por Seção

### Sidebar
```
Background: Linear gradient (#667eea → #764ba2)
Texto: Branco
Hover item: +10% opacidade branca
Active item: +20% opacidade branca + borda esquerda
```

### Header
```
Background: Branco
Texto: #2c3e50
Border-bottom: 1px #dee2e6
Sombra: Leve
```

### Conteúdo
```
Background: #f8f9fa
Cards: Branco com sombra suave
Texto: #2c3e50
```

### Tabela
```
Header: Background #f8f9fa
Linhas: Alternadas branco (normal) e ligeiro hover
Borders: 1px #dee2e6
Low-stock: Background #fff3cd
```

---

## Ícones Usados

```
📊 Dashboard
📦 Produtos / Estoque
⚙️  Configurações
👤 Usuário
✏️  Editar
🗑️  Deletar
🔍 Buscar
➕ Novo
⚠️  Aviso / Estoque Baixo
💰 Valor/Dinheiro
✅ Sucesso
❌ Erro
ℹ️  Informação
☰ Menu mobile
✕ Fechar
```

---

## Performance & Otimizações

```
Dashboard:
├─ Carregar produtos: < 500ms
├─ Renderizar métricas: < 100ms
└─ Total: < 600ms

Busca:
├─ Filtragem em tempo real
├─ Sem delay perceptível
└─ Suporta 1000+ produtos

Animações:
├─ Hardware accelerated
├─ 60fps no desktop
└─ 30fps mínimo em mobile
```

---

**Design criado com foco em UX/UI moderna e responsiva!** 🎨
