// Script de teste para a API
// Use este arquivo para testar os endpoints sem precisar do frontend

const BASE_URL = 'http://localhost:3000/api';

// ====== FUNÇÃO AUXILIAR ======
async function apiRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            // Adicionar token se estiver disponível
            ...(localStorage.getItem('token') && {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            })
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();

        return {
            status: response.status,
            success: response.ok,
            data
        };
    } catch (error) {
        return {
            status: 0,
            success: false,
            error: error.message
        };
    }
}

// ====== TESTES ======

async function testAuthAPI() {
    console.log('🧪 Iniciando testes da API de Autenticação...\n');

    // 1️⃣ Login com admin
    console.log('1️⃣ Testando LOGIN como ADMIN');
    const loginAdminResult = await apiRequest('POST', '/auth/login', {
        username: 'admin',
        password: 'admin123'
    });
    console.log('Status:', loginAdminResult.status);
    console.log('Response:', loginAdminResult.data);
    
    if (loginAdminResult.success) {
        localStorage.setItem('token', loginAdminResult.data.token);
        console.log('✅ Login bem sucedido! Token salvo.\n');
    } else {
        console.log('❌ Login falhou!\n');
        return;
    }

    // 2️⃣ Tentar CREATE produto como ADMIN
    console.log('2️⃣ Testando CREATE PRODUTO como ADMIN');
    const createProductResult = await apiRequest('POST', '/products', {
        name: 'Produto Teste ' + Date.now(),
        quantity: 50,
        price: 199.90
    });
    console.log('Status:', createProductResult.status);
    console.log('Response:', createProductResult.data);
    console.log('✅ CREATE bem sucedido!\n' || '❌ CREATE falhou!\n');

    // 3️⃣ GET todos os produtos
    console.log('3️⃣ Testando GET TODOS PRODUTOS');
    const getAllProductsResult = await apiRequest('GET', '/products');
    console.log('Status:', getAllProductsResult.status);
    console.log('Produtos encontrados:', getAllProductsResult.data.data?.length || 0);
    console.log('✅ GET bem sucedido!\n');

    // 4️⃣ Logout e login como Funcionário
    console.log('4️⃣ Testando LOGIN como FUNCIONÁRIO');
    const loginEmployeeResult = await apiRequest('POST', '/auth/login', {
        username: 'funcionario',
        password: 'func123'
    });
    console.log('Status:', loginEmployeeResult.status);
    
    if (loginEmployeeResult.success) {
        // Atualizar token para funcionário
        localStorage.setItem('token', loginEmployeeResult.data.token);
        console.log('✅ Login bem sucedido! Token do funcionário salvo.\n');
    }

    // 5️⃣ Tentar CREATE produto como EMPLOYEE (deve falhar)
    console.log('5️⃣ Testando CREATE PRODUTO como EMPLOYEE (deve falhar)');
    const createAsEmployeeResult = await apiRequest('POST', '/products', {
        name: 'Produto Teste Employee ' + Date.now(),
        quantity: 10,
        price: 99.90
    });
    console.log('Status:', createAsEmployeeResult.status);
    console.log('Response:', createAsEmployeeResult.data);
    console.log('Expected 403 Forbidden:', createAsEmployeeResult.status === 403 ? '✅' : '❌', '\n');

    // 6️⃣ Registrar novo usuário
    console.log('6️⃣ Testando REGISTER novo usuário');
    localStorage.removeItem('token'); // Remover token para testar sem autenticação
    
    const newUsername = 'user_' + Date.now();
    const registerResult = await apiRequest('POST', '/auth/register', {
        username: newUsername,
        password: 'senha123',
        role: 'employee'
    });
    console.log('Status:', registerResult.status);
    console.log('Response:', registerResult.data);
    console.log(registerResult.success ? '✅ Registro bem sucedido!' : '❌ Registro falhou!', '\n');

    // 7️⃣ Tentar acessar produtos sem token (deve falhar)
    console.log('7️⃣ Testando GET PRODUTOS SEM TOKEN (deve falhar)');
    const noTokenResult = await apiRequest('GET', '/products');
    console.log('Status:', noTokenResult.status);
    console.log('Response:', noTokenResult.data);
    console.log('Expected 401 Unauthorized:', noTokenResult.status === 401 ? '✅' : '❌', '\n');

    console.log('✅ Todos os testes concluídos!');
}

// Executar testes no console do navegador
// Copie o código completo deste arquivo e execute no console do navegador (F12 > Console)
// Depois execute: testAuthAPI()

console.log('📌 Para executar os testes, abra o console (F12) e execute: testAuthAPI()');
