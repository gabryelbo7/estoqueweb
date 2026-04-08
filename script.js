const API_URL = '/api/products';
const AUTH_URL = '/api/auth';

// Gerenciamento de token e usuário
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function getUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('user');
}

function isLoggedIn() {
    return !!getToken();
}

// Headers com token
function getAuthHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// Funções de UX
function showMessage(message, type = 'success') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = `message-area message-${type}`;
    messageArea.style.display = 'block';

    // Esconder após 5 segundos
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    if (isLoading) {
        button.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
    } else {
        button.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Login
async function handleLogin(e) {
    e.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    setLoading(loginBtn, true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        updateUserDisplay();
        showMain();
        loadProducts();
        showMessage('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no login:', error);
        showMessage(`Erro no login: ${error.message}`, 'error');
    } finally {
        setLoading(loginBtn, false);
    }
}

// Logout
async function handleLogout() {
    removeToken();
    removeUser();
    document.getElementById('loginForm').reset();
    document.getElementById('productForm').reset();
    showLogin();
    updateUserDisplay();
    showMessage('Logout realizado com sucesso!', 'success');
}

// Atualizar exibição de usuário
function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const user = getUser();

    if (user && userDisplay) {
        const roleLabel = user.role === 'admin' ? '🔐 Admin' : '👤 Funcionário';
        userDisplay.textContent = `${user.username} (${roleLabel})`;
    }
}

// Controle de visibilidade
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

function showMain() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Modal de confirmação
let productToDelete = null;

function confirmDelete(id, name) {
    productToDelete = id;
    document.getElementById('confirmMessage').textContent = `Tem certeza que deseja excluir "${name}"?`;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    productToDelete = null;
}

document.addEventListener('DOMContentLoaded', () => {
    updateUserDisplay(); // Atualizar exibição do usuário

    if (isLoggedIn()) {
        showMain();
        loadProducts();
    } else {
        showLogin();
    }

    // Event listeners
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);

    const productForm = document.getElementById('productForm');
    productForm.addEventListener('submit', handleFormSubmit);

    // Modal listeners
    document.getElementById('confirmCancel').addEventListener('click', closeModal);
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
            closeModal();
        }
    });

    // Fechar modal ao clicar fora
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirmModal')) {
            closeModal();
        }
    });
});

// Carregar produtos do backend
async function loadProducts() {
    try {
        const response = await fetch(API_URL, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                removeToken();
                showLogin();
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        renderTable(result.data);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showMessage('Erro ao carregar produtos. Verifique sua conexão e tente novamente.', 'error');
    }
}

// Renderizar tabela
function renderTable(products) {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    products.forEach(product => {
        const isLowStock = product.quantity < 5;
        const rowClass = isLowStock ? 'low-stock' : '';
        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>R$ ${product.price.toFixed(2)}</td>
            <td>${product.quantity} ${isLowStock ? '<span class="warning-icon">⚠️</span>' : ''}</td>
            <td class="actions">
                <button class="btn-sm btn-plus" onclick="updateQuantity(${product.id}, ${product.quantity + 1})">+</button>
                <button class="btn-sm btn-minus" onclick="updateQuantity(${product.id}, ${product.quantity - 1})">-</button>
                <button class="btn-sm btn-danger" onclick="confirmDelete(${product.id}, '${product.name}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Adicionar produto
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    setLoading(submitBtn, true);
    
    const name = document.getElementById('name').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, quantity, price })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }
        
        document.getElementById('productForm').reset();
        loadProducts(); // Recarrega a lista
        showMessage('Produto adicionado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showMessage(`Erro ao salvar produto: ${error.message}`, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

// Atualizar quantidade (+ ou -)
window.updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 0) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }
        
        loadProducts();
        showMessage('Quantidade atualizada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar quantidade:', error);
        showMessage(`Erro ao atualizar quantidade: ${error.message}`, 'error');
    }
};

// Deletar produto
window.deleteProduct = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }
        
        loadProducts();
        showMessage('Produto excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showMessage(`Erro ao excluir produto: ${error.message}`, 'error');
    }
};