/* ========================================
   EMPLOYEE INTERFACE - JAVASCRIPT
   ======================================== */

const API_URL = '/api/products';
const AUTH_URL = '/api/auth';

// Estado da aplicação
let currentUser = null;
let allProducts = [];
let filteredProducts = [];
let selectedProductId = null;
let actionType = null; // 'in' ou 'out'

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
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        // Verificar role - apenas employee pode acessar employee.html
        const user = getUser();
        if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
            // Redireciona para login se não é employee/admin
            removeToken();
            removeUser();
            window.location.href = '/login.html?error=acesso_negado';
            return;
        }
        loadProducts();
        updateUserDisplay();
    } else {
        // Se não está logado, redireciona para login
        window.location.href = '/login.html';
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Fechar modals ao clicar fora
    document.getElementById('outModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('outModal')) {
            closeOutModal();
        }
    });

    document.getElementById('inModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('inModal')) {
            closeInModal();
        }
    });
});

function isLoggedIn() {
    return !!getToken();
}

function updateUserDisplay() {
    const user = getUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
    }
}

function handleLogout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        removeToken();
        removeUser();
        // Redirecionar para login
        window.location.href = '/login.html';
    }
}

// ========================================
// MENSAGENS
// ========================================

function showMessage(message, type = 'success') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = `message-area message-${type}`;
    messageArea.style.display = 'block';

    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 3500);
}

// ========================================
// PRODUTOS
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
        filteredProducts = [...allProducts];

        renderProducts(filteredProducts);
        updateStats();

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showMessage('Erro ao carregar produtos', 'error');
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">Nenhum produto encontrado</div>
                <div class="empty-state-text">Tente buscar por outro termo</div>
            </div>
        `;
        return;
    }

    products.forEach(product => {
        const isLowStock = product.quantity < 5;
        const card = document.createElement('div');
        card.className = `product-card ${isLowStock ? 'low-stock' : ''}`;

        card.innerHTML = `
            <div class="product-header">
                <div class="product-id">#${product.id}</div>
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
            </div>

            <div class="product-body">
                <div class="quantity-info">
                    <span class="quantity-label">📦 Estoque</span>
                    <span class="quantity-value">${product.quantity}</span>
                </div>
            </div>

            <div class="product-footer">
                <div class="quantity-controls">
                    <button class="qty-btn-small qty-plus" onclick="openInModal(${product.id})">
                        📥 +${1}
                    </button>
                    <button class="qty-btn-small qty-minus" onclick="openOutModal(${product.id})">
                        📤 -${1}
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.id.toString().includes(query)
    );
    renderProducts(filteredProducts);
}

// ========================================
// ENTRADA/SAÍDA
// ========================================

function openInModal(productId) {
    selectedProductId = productId;
    actionType = 'in';
    document.getElementById('inQuantity').value = 1;
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        document.getElementById('inModalMessage').textContent = 
            `${product.name} - Estoque atual: ${product.quantity}`;
    }
    document.getElementById('inModal').style.display = 'flex';
}

function closeInModal() {
    document.getElementById('inModal').style.display = 'none';
    selectedProductId = null;
    actionType = null;
}

function openOutModal(productId) {
    selectedProductId = productId;
    actionType = 'out';
    document.getElementById('outQuantity').value = 1;
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        document.getElementById('outModalMessage').textContent = 
            `${product.name} - Estoque atual: ${product.quantity}`;
    }
    document.getElementById('outModal').style.display = 'flex';
}

function closeOutModal() {
    document.getElementById('outModal').style.display = 'none';
    selectedProductId = null;
    actionType = null;
}

function increaseQtyIn() {
    const input = document.getElementById('inQuantity');
    input.value = parseInt(input.value) + 1;
}

function decreaseQtyIn() {
    const input = document.getElementById('inQuantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function increaseQtyOut() {
    const input = document.getElementById('outQuantity');
    const product = allProducts.find(p => p.id === selectedProductId);
    if (product && parseInt(input.value) < product.quantity) {
        input.value = parseInt(input.value) + 1;
    }
}

function decreaseQtyOut() {
    const input = document.getElementById('outQuantity');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

async function confirmIn() {
    if (!selectedProductId) return;

    const product = allProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const quantity = parseInt(document.getElementById('inQuantity').value);
    const newQuantity = product.quantity + quantity;

    try {
        const response = await fetch(`${API_URL}/${selectedProductId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar estoque');
        }

        showMessage(`✅ ${quantity} unidade(s) adicionada(s) a "${product.name}"`, 'success');
        closeInModal();
        await loadProducts();

    } catch (error) {
        showMessage(`Erro: ${error.message}`, 'error');
    }
}

async function confirmOut() {
    if (!selectedProductId) return;

    const product = allProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const quantity = parseInt(document.getElementById('outQuantity').value);

    if (quantity > product.quantity) {
        showMessage('Quantidade maior que o estoque disponível', 'error');
        return;
    }

    const newQuantity = product.quantity - quantity;

    try {
        const response = await fetch(`${API_URL}/${selectedProductId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar estoque');
        }

        showMessage(`✅ ${quantity} unidade(s) removida(s) de "${product.name}"`, 'success');
        closeOutModal();
        await loadProducts();

    } catch (error) {
        showMessage(`Erro: ${error.message}`, 'error');
    }
}

// ========================================
// ESTATÍSTICAS
// ========================================

function updateStats() {
    const total = allProducts.length;
    const totalQuantity = allProducts.reduce((sum, p) => sum + p.quantity, 0);
    const lowStock = allProducts.filter(p => p.quantity < 5).length;

    document.getElementById('totalProducts').textContent = total;
    document.getElementById('totalQuantity').textContent = totalQuantity;
    document.getElementById('lowStockProducts').textContent = lowStock;
}

// ========================================
// UTILITÁRIOS
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
