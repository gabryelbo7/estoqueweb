const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { db, dbRun, dbGet, dbAll } = require('./database');
const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const { authenticateToken, requireAdmin, requireEmployee, protectAdminPage, protectEmployeePage } = require('./middleware/auth');
const { globalErrorHandler } = require('./middleware/errorHandler');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./controllers/authController');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ⚠️ ARQUITETURA DE SEGURANÇA
// ========================================
// Este servidor implementa múltiplas camadas de proteção:
// 1. Middleware de verificação de token (verifyTokenFromCookie)
// 2. Middlewares de autorização por role (protectAdminPage, protectEmployeePage)
// 3. Proteção de rotas HTML sensíveis (index.html, admin.html, employee.html)
// 4. Redirecimento automático para login.html
// 5. Logs de segurança para tentativas não autorizadas
//
// Uma página só é servida se:
// ✅ Usuário tem um token JWT válido
// ✅ Usuário tem o role correto para aquela página
// ✅ Token não está expirado
//
// Sem esses requisitos, usuário é redirecionado para login.html
// ========================================

// ========================================
// MIDDLEWARE GLOBAL - JSON PARSING
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================================
// MIDDLEWARE DE VERIFICAÇÃO DE TOKEN (Cookies)
// ========================================

/**
 * Middleware para verificar token do cookie
 * Torna o token acessível para rotas protegidas
 */
const verifyTokenFromCookie = (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;
        } catch (err) {
            console.log('Token inválido ou expirado:', err.message);
        }
    }
    next();
};

app.use(verifyTokenFromCookie);

// ========================================
// MIDDLEWARE DE LOGGING
// ========================================

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// ========================================
// MIDDLEWARE PARA PROTEGER PÁGINAS HTML
// ========================================

/**
 * Middleware para proteger rotas de admin
 * Redireciona para login se não autenticado ou role inválido
 * @security Verifica token e role antes de servir página sensível
 */
const protectAdminPage = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.warn(`⚠️  Tentativa de acesso não autorizado a recurso admin: ${req.ip}`);
        return res.redirect('/login.html?error=admin_only');
    }
    next();
};

/**
 * Middleware para proteger rotas de funcionário/employee
 * Redireciona para login se não autenticado ou role inválido
 * @security Verifica token e role antes de servir página sensível
 */
const protectEmployeePage = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        console.warn(`⚠️  Tentativa de acesso não autorizado a recurso employee: ${req.ip}`);
        return res.redirect('/login.html?error=employee_only');
    }
    next();
};

/**
 * Middleware para proteger arquivos HTML sensíveis (como index.html)
 * Bloqueia acesso a páginas admin/employee através de arquivos estáticos
 * @security Impede acesso a painéis sem autenticação
 */
const protectSensitivePages = (req, res, next) => {
    // Lista de arquivos sensíveis que requerem autenticação
    const sensitiveFiles = ['index.html', 'admin.html', 'employee.html'];
    
    // Verificar se a requisição é para um arquivo sensível
    if (sensitiveFiles.some(file => req.path.includes(file))) {
        if (!req.user) {
            console.warn(`⚠️  Tentativa de acesso a arquivo protegido sem autenticação: ${req.path} (${req.ip})`);
            return res.redirect('/login.html?error=unauthorized');
        }
    }
    next();
};

// ========================================
// ROTAS DE PÁGINAS PROTEGIDAS
// ========================================

/**
 * ⚠️ REQUER AUTENTICAÇÃO: Páginas sensíveis
 * Aplicar middleware de proteção para todas as páginas HTML sensíveis
 */

/**
 * Rota /index.html - Protegida (alias para admin.html)
 * ⚠️ SEGURANÇA: Impede acesso ao painel sem autenticação
 * Usuários não autenticados são redirecionados para login
 */
app.get('/index.html', protectAdminPage, (req, res) => {
    console.log(`✓ Admin ${req.user.username} acessou /index.html`);
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Rota /admin.html - Protegida (painel administrativo)
 * ⚠️ SEGURANÇA: Apenas usuários com role 'admin'
 * Verifica token JWT antes de servir
 */
app.get('/admin.html', protectAdminPage, (req, res) => {
    console.log(`✓ Admin ${req.user.username} acessou /admin.html`);
    res.sendFile(path.join(__dirname, 'admin.html'));
});

/**
 * Rota /employee.html - Protegida (painel de funcionário)
 * ⚠️ SEGURANÇA: Apenas usuários com role 'employee' ou 'admin'
 * Verifica token JWT antes de servir
 */
app.get('/employee.html', protectEmployeePage, (req, res) => {
    console.log(`✓ Usuário ${req.user.username} (${req.user.role}) acessou /employee.html`);
    res.sendFile(path.join(__dirname, 'employee.html'));
});

// ========================================
// ARQUIVOS ESTÁTICOS (Públicos)
// ========================================
// Movido para baixo para garantir que as rotas HTML protegidas acima tenham prioridade
app.use(express.static(path.join(__dirname)));

/**
 * ✅ PÚBLICO: Rotas públicas
 */

/**
 * Rota raiz '/' - Página de Login
 * Pública: Qualquer usuário pode acessar
 * Usuários autenticados são redirecionados para seu painel
 */
app.get('/', (req, res) => {
    // Se já está autenticado, redirecionar para seu painel
    if (req.user) {
        console.log(`✓ Usuário ${req.user.username} redirecionado do login para seu painel`);
        return res.redirect(req.user.role === 'admin' ? '/admin.html' : '/employee.html');
    }
    // Servir página de login
    res.sendFile(path.join(__dirname, 'login.html'));
});

/**
 * Rota /login.html - Página de Login
 * Pública: Qualquer usuário pode acessar
 * Se já autenticado, redireciona para painel apropriado
 */
app.get('/login.html', (req, res) => {
    // Se já está autenticado, redirecionar para seu painel
    if (req.user) {
        console.log(`✓ Usuário ${req.user.username} redirecionado do login para seu painel`);
        return res.redirect(req.user.role === 'admin' ? '/admin.html' : '/employee.html');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ========================================
// ROTAS DA API
// ========================================

/**
 * ROTAS PÚBLICAS
 */
app.use('/api/auth', authRoutes);

/**
 * ROTAS PROTEGIDAS
 */

// Middleware de autenticação para rotas de produtos e dashboard
app.use('/api/products', authenticateToken);
app.use('/api/dashboard', authenticateToken, requireEmployee);

// Aplicar middlewares específicos nas rotas de produtos
app.post('/api/products', requireAdmin); // Só admin pode criar
app.delete('/api/products/:id', requireAdmin); // Só admin pode deletar
// GET e PUT são permitidos para employee (já protegidos pelo authenticateToken)

app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ========================================
// ROTA 404 - Página não encontrada
// ========================================

/**
 * Catch-all para rotas não encontradas
 * Redireciona para login se não autenticado
 * Retorna 404 se autenticado mas página não existe
 */
app.get('*', (req, res) => {
    // Se tenta acessar arquivo que não existe
    if (!req.user) {
        // Não autenticado: redireciona para login
        console.warn(`⚠️  Tentativa de acesso a rota inexistente sem autenticação: ${req.path} (${req.ip})`);
        return res.redirect('/login.html');
    }
    
    // Autenticado mas página não existe
    console.warn(`⚠️  Página não encontrada: ${req.path} para usuário ${req.user.username}`);
    res.status(404).json({
        error: 'Página não encontrada',
        path: req.path,
        message: 'A página que você está procurando não existe.'
    });
});

// ========================================
// MIDDLEWARE DE ERRO GLOBAL
// ========================================
// Deve estar APÓS todas as rotas
app.use(globalErrorHandler);

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
    console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
    console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
});