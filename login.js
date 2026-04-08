/* ========================================
   LOGIN - JAVASCRIPT
   Autentica usuário e redireciona baseado em role
   ======================================== */

const AUTH_URL = '/api/auth';

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Se já está logado, redireciona para a página apropriada
    const user = getUser();
    if (user) {
        redirectByRole(user.role);
        return;
    }

    // Verificar se tem erro na URL
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
        if (error === 'admin_only') {
            showMessage('⚠️ Acesso restrito a administradores', 'error');
        } else if (error === 'employee_only') {
            showMessage('⚠️ Acesso restrito a funcionários', 'error');
        } else if (error === 'acesso_negado') {
            showMessage('⚠️ Acesso negado. Faça login novamente', 'error');
        }
        // Limpar URL
        window.history.replaceState({}, document.title, '/login.html');
    }

    // Form submit
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

// ========================================
// AUTENTICAÇÃO
// ========================================

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageArea = document.getElementById('messageArea');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoading = loginBtn.querySelector('.btn-loading');

    // Validação básica
    if (!username || !password) {
        showMessage('Usuário e senha são obrigatórios', 'error');
        return;
    }

    try {
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        // Fazer requisição de login
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        // Validar se o role do usuário é permitido
        const userRole = data.user.role;
        if (userRole !== 'admin' && userRole !== 'employee') {
            throw new Error('Role de usuário inválido');
        }

        // Salvar token e usuário
        setToken(data.token);
        setUser(data.user);

        // Mostrar sucesso
        showMessage('✅ Login realizado com sucesso!', 'success');

        // Redirecionar após 500ms
        setTimeout(() => {
            redirectByRole(userRole);
        }, 500);

    } catch (error) {
        showMessage(`❌ ${error.message}`, 'error');
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// ========================================
// REDIRECIONAMENTO BASEADO EM ROLE
// ========================================

/**
 * Redireciona o usuário para a página apropriada baseado em seu role
 * @param {string} role - Role do usuário ('admin' ou 'employee')
 */
function redirectByRole(role) {
    console.log(`🔄 Redirecionando usuário com role: ${role}`);
    
    if (role === 'admin') {
        // Admin pode acessar a tela de admin
        window.location.href = '/admin.html';
    } else if (role === 'employee') {
        // Funcionário acessa a tela de funcionário
        window.location.href = '/employee.html';
    } else {
        showMessage('❌ Role de usuário não reconhecido', 'error');
        console.error(`Role inválido: ${role}`);
    }
}

// ========================================
// ARMAZENAMENTO (LocalStorage para dados do usuário)
// ========================================

/**
 * Obtém token do localStorage
 * (O token também é armazenado em cookie HTTP-only no server)
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Obtém dados do usuário do localStorage
 */
function getUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Salva token no localStorage
 */
function setToken(token) {
    localStorage.setItem('token', token);
}

/**
 * Salva dados do usuário no localStorage
 */
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Remove token e dados do usuário do localStorage
 */
function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Dados de autenticação removidos do localStorage');
}

// ========================================
// UI
// ========================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = `message message-${type}`;

    if (type === 'error') {
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000);
    }
}

// ========================================
// LOGOUT
// ========================================

/**
 * Função de logout global
 * Limpa os dados de autenticação e redireciona para login
 */
async function handleLogout() {
    try {
        console.log('🔓 Realizando logout...');
        
        // Limpar dados locais
        clearAuthData();

        // Chamar API de logout (para limpar cookie HTTP-only no servidor)
        await fetch(`${AUTH_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.log('Logout API error (expected):', err.message));

        // Redirecionar para login
        showMessage('✅ Deslogado com sucesso', 'success');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 500);

    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        // Forçar redirecionamento mesmo com erro
        window.location.href = '/login.html';
    }
}

// ========================================
// FUNÇÕES AUXILIARES PARA REQUISIÇÕES
// ========================================

/**
 * Retorna headers com token para requisições API
 */
function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}
