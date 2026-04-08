/* ========================================
   ADMIN DASHBOARD - JAVASCRIPT
   ======================================== */

const API_URL = '/api/products';
const AUTH_URL = '/api/auth';

// Estado da aplicação
let currentPage = 'dashboard';
let allProducts = [];
let editingProductId = null;
let deletingProductId = null;
let recentChanges = [];

// Últimas 5 mudanças
const MAX_RECENT_CHANGES = 5;

// ========================================
// AUTENTICAÇÃO
// ========================================

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function removeToken() {
    localStorage.removeItem('token');
}

function removeUser() {
    localStorage.removeItem('user');
}

function isLoggedIn() {
    return !!getToken();
}

function getAuthHeaders() {
    const token = getToken();
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

// ========================================
// NAVEGAÇÃO
// ========================================

function showPage(pageName) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar página selecionada
    const page = document.getElementById(pageName + 'Page');
    if (page) {
        page.classList.add('active');
    }

    // Atualizar menu ativo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // Atualizar título
    const titles = {
        dashboard: 'Dashboard',
        products: 'Produtos',
        settings: 'Configurações'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || 'Dashboard';

    currentPage = pageName;

    // Carregar dados da página
    if (pageName === 'products') {
        loadProducts();
    } else if (pageName === 'dashboard') {
        updateMetrics();
    }

    // Fechar sidebar em mobile
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('show');
    }
}

// ========================================
// DASHBOARD - INICIALIZAÇÃO E FETCH
// ========================================

async function initDashboard() {
    try {
        // Busca dados consolidados da rota de dashboard
        const response = await fetch('/api/dashboard', {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Falha ao carregar dados do dashboard');

        const result = await response.json();
        const data = result.data;

        // Atualiza os cards com os dados vindos da API
        document.getElementById('metricTotal').textContent = data.totalProducts || 0;
        document.getElementById('metricQuantity').textContent = data.totalQuantity || 0;
        
        // Garante a formatação de moeda brasileira
        const valorTotal = data.totalValue || 0;
        document.getElementById('metricValue').textContent = data.totalValueFormatted || 
            valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        document.getElementById('metricLowStock').textContent = data.lowStockCount || 0;

        // Atualiza a lista visual de mudanças recentes
        updateRecentChanges();
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
        // Fallback: Se a rota de dashboard falhar, tentamos carregar via produtos
        loadProducts();
    }
}

// ========================================
// DASHBOARD - INICIALIZAÇÃO E FETCH
// ========================================

async function initDashboard() {
    try {
        // Busca dados consolidados da rota de dashboard
        const response = await fetch('/api/dashboard', {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Falha ao carregar dados do dashboard');

        const result = await response.json();
        const data = result.data;

        // Atualiza os cards com os dados vindos da API
        document.getElementById('metricTotal').textContent = data.totalProducts || 0;
        document.getElementById('metricQuantity').textContent = data.totalQuantity || 0;
        
        // Garante a formatação de moeda brasileira
        const valorTotal = data.totalValue || 0;
        document.getElementById('metricValue').textContent = data.totalValueFormatted || 
            valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        document.getElementById('metricLowStock').textContent = data.lowStockCount || 0;

        // Atualiza a lista visual de mudanças recentes
        updateRecentChanges();
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
        // Fallback: Se a rota de dashboard falhar, tentamos carregar via produtos
        loadProducts();
    }
}

// ========================================
// NAVEGAÇÃO E UI
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    if (!isLoggedIn()) {
        // Redirecionar para login
        window.location.href = '/login.html';
        return;
    }

    // Verificar role - apenas admin pode acessar admin.html
    const user = getUser();
    if (!user || user.role !== 'admin') {
        // Redireciona para login se não é admin
        removeToken();
        removeUser();
        window.location.href = '/login.html?error=acesso_negado';
        return;
    }

    // Atualizar informações do usuário
    updateUserDisplay();

    // Event listeners de navegação
    document.querySelectorAll('[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });

    // Busca de produtos
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Inicializar
    showPage('dashboard');
});

function updateUserDisplay() {
    const user = getUser();
    if (!user) return;

    const roleLabel = user.role === 'admin' ? 'Administrador' : 'Funcionário';
    document.getElementById('sidebarUserName').textContent = user.username;
    document.getElementById('sidebarUserRole').textContent = roleLabel;
    document.getElementById('headerUserDisplay').textContent = `${user.username} (${roleLabel})`;

    // Atualizar hora de logout (após 24h)
    const logoutTimeEl = document.getElementById('logoutTime');
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    logoutTimeEl.textContent = `Conectado em ${now}`;
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
}

// ========================================
// MESSAGES
// ========================================

function showMessage(message, type = 'success') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = `message-area message-${type}`;
    messageArea.style.display = 'block';

    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 4000);
}

// ========================================
// PRODUTOS - CRUD
// ========================================

async function loadProducts() {
    try {
        const response = await fetch(API_URL, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                removeToken();
                removeUser();
                location.reload();
            }
            throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        allProducts = data.data || [];
        renderProductsTable(allProducts);
        updateMetrics();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showMessage('Erro ao carregar produtos', 'error');
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                    📦 Nenhum produto cadastrado
                </td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const totalValue = (product.price * product.quantity).toFixed(2);
        const isLowStock = product.quantity < 5;
        const rowClass = isLowStock ? 'low-stock' : '';

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td class="col-id">${product.id}</td>
            <td class="col-name">${escapeHtml(product.name)}</td>
            <td class="col-price">R$ ${product.price.toFixed(2)}</td>
            <td class="col-quantity">
                ${product.quantity}
                ${isLowStock ? '<span style="margin-left: 5px;">⚠️</span>' : ''}
            </td>
            <td class="col-value">R$ ${totalValue}</td>
            <td class="col-actions actions">
                <button class="action-btn btn-edit" onclick="editProduct(${product.id})">✏️ Editar</button>
                <button class="action-btn btn-delete" onclick="openDeleteModal(${product.id}, '${escapeHtml(product.name)}')">🗑️ Deletar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.id.toString().includes(query)
    );
    renderProductsTable(filtered);
}

// ========================================
// MODAL - PRODUTO
// ========================================

function openProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Novo Produto';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Editar Produto';
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQuantity').value = product.quantity;

    document.getElementById('productModal').style.display = 'flex';
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);

    if (!name || isNaN(price) || isNaN(quantity)) {
        showMessage('Preencha todos os campos corretamente', 'error');
        return;
    }

    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    try {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        const url = editingProductId ? `${API_URL}/${editingProductId}` : API_URL;
        const method = editingProductId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, price, quantity })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Erro ${response.status}`);
        }

        showMessage(
            editingProductId ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!',
            'success'
        );

        closeProductModal();
        await loadProducts();

        // Adicionar ao histórico
        addRecentChange(
            editingProductId ? 'Atualizado' : 'Criado',
            name
        );

    } catch (error) {
        showMessage(`Erro: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// ========================================
// MODAL - DELETAR
// ========================================

function openDeleteModal(productId, productName) {
    deletingProductId = productId;
    document.getElementById('deleteMessage').textContent = 
        `Tem certeza que deseja excluir "${productName}"? Esta ação não pode ser desfeita.`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deletingProductId = null;
}

async function confirmDeleteProduct() {
    if (!deletingProductId) return;

    try {
        const response = await fetch(`${API_URL}/${deletingProductId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Erro ${response.status}`);
        }

        showMessage('Produto deletado com sucesso!', 'success');
        closeDeleteModal();
        await loadProducts();

        // Adicionar ao histórico
        const product = allProducts.find(p => p.id === deletingProductId);
        if (product) {
            addRecentChange('Deletado', product.name);
        }

    } catch (error) {
        showMessage(`Erro ao deletar: ${error.message}`, 'error');
    }
}

// Fechar modals ao clicar fora
document.addEventListener('click', (e) => {
    const productModal = document.getElementById('productModal');
    const deleteModal = document.getElementById('deleteModal');

    if (e.target === productModal) closeProductModal();
    if (e.target === deleteModal) closeDeleteModal();
});

// ========================================
// MÉTRICAS - DASHBOARD
// ========================================

function updateMetrics() {
    const metrics = calculateMetrics();

    document.getElementById('metricTotal').textContent = metrics.total;
    document.getElementById('metricQuantity').textContent = metrics.quantity;
    document.getElementById('metricValue').textContent = metrics.value;
    document.getElementById('metricLowStock').textContent = metrics.lowStock;

    updateRecentChanges();
}

function calculateMetrics() {
    const total = allProducts.length;
    const quantity = allProducts.reduce((sum, p) => sum + p.quantity, 0);
    const value = allProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const lowStock = allProducts.filter(p => p.quantity < 5).length;

    return {
        total,
        quantity,
        value: `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        lowStock
    };
}

function addRecentChange(action, productName) {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    recentChanges.unshift({
        action,
        product: productName,
        time
    });

    if (recentChanges.length > MAX_RECENT_CHANGES) {
        recentChanges.pop();
    }

    updateRecentChanges();
}

function updateRecentChanges() {
    const recentList = document.getElementById('recentChanges');

    if (recentChanges.length === 0) {
        recentList.innerHTML = '<p style="color: #999;">Nenhuma atualização recente</p>';
        return;
    }

    recentList.innerHTML = recentChanges.map(change => `
        <div class="recent-item">
            <strong>${change.action}</strong> - ${change.product} 
            <span style="color: #999; font-size: 0.85em;">${change.time}</span>
        </div>
    `).join('');
}

// ========================================
// LOGOUT
// ========================================

async function handleLogout() {
    try {
        if (confirm('Deseja realmente sair do sistema?')) {
            // Limpar dados locais
            removeToken();
            removeUser();

            // Chamar API de logout (para limpar cookie no servidor)
            await fetch(`${AUTH_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            }).catch(err => console.log('Logout API error:', err.message));

            // Redirecionar para login
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        // Forçar redirecionamento mesmo com erro
        window.location.href = '/login.html';
    }
}

// ========================================
// SETTINGS
// ========================================

function openUserModal() {
    showMessage('Criação de usuários disponível em breve', 'info');
}

function exportDatabase() {
    showMessage('Exportação de dados disponível em breve', 'info');
}

function clearCache() {
    localStorage.clear();
    sessionStorage.clear();
    showMessage('Cache limpo com sucesso!', 'success');
    setTimeout(() => location.reload(), 1000);
}

// ========================================
// LOGIN (First Time)
// ========================================

function createLoginInterface() {
    // Função removida - redirecionamento para login.html agora é feito em DOMContentLoaded
}

// ========================================
// UTILIDADES
// ========================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

// ========================================
// TEMAS (Opcional)
// ========================================

// Detectar preferência de tema do sistema
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Pode implementar tema escuro aqui
}

// Listener para mudança de tema
window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
    // Atualizar tema se necessário
});
