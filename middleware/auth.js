const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controllers/authController');

/**
 * Middleware para autenticar o token JWT
 * Verifica se o token é válido e adiciona os dados do usuário à requisição
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Token de acesso não fornecido.',
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            const statusCode = err.name === 'TokenExpiredError' ? 401 : 403;
            return res.status(statusCode).json({ 
                error: 'Token inválido ou expirado.',
                code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
            });
        }

        req.user = user; // Adiciona o usuário decodificado à requisição
        next();
    });
};

/**
 * Middleware para verificar se o usuário é admin
 * Deve ser usado após authenticateToken
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Acesso negado. Requer privilégios de administrador.',
            code: 'ADMIN_REQUIRED',
            userRole: req.user?.role
        });
    }
    next();
};

/**
 * Middleware para verificar se é admin ou employee
 * Deve ser usado após authenticateToken
 */
const requireEmployee = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        return res.status(403).json({ 
            error: 'Acesso negado. Requer privilégios de funcionário ou administrador.',
            code: 'EMPLOYEE_REQUIRED',
            userRole: req.user?.role
        });
    }
    next();
};

/**
 * Middleware para verificar se é employee
 * Deve ser usado após authenticateToken
 */
const requireEmployeeOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'employee') {
        return res.status(403).json({ 
            error: 'Acesso negado. Esta ação requer privilégios de funcionário.',
            code: 'EMPLOYEE_ONLY',
            userRole: req.user?.role
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireEmployee,
    requireEmployeeOnly
};