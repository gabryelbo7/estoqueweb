const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../database');

// Use variável de ambiente em produção
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_aqui_mude_em_producao';

/**
 * Login de usuário
 * Verifica credenciais e retorna JWT token
 * @param {object} req - Requisição Express (body: username, password)
 * @param {object} res - Resposta Express
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validação de entrada
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuário e senha são obrigatórios.',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Buscar usuário no banco de dados
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            // Não revelar se usuário existe ou não (segurança)
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Comparar senha usando bcrypt assíncrono
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Gerar token JWT com role e store_id
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                store_id: user.store_id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Enviar token em cookie HTTP-only (seguro contra XSS)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login realizado com sucesso.',
            token,  // Também retorna o token para uso em requisições API
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                store_id: user.store_id
            }
        });
    } catch (err) {
        console.error('❌ Erro ao fazer login:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'LOGIN_ERROR'
        });
    }
};

/**
 * Registrar novo usuário
 * @param {object} req - Requisição Express (body: username, password, role)
 * @param {object} res - Resposta Express
 */
const register = async (req, res) => {
    try {
        const { username, password, role = 'employee' } = req.body;

        // Validações de entrada
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuário e senha são obrigatórios.',
                code: 'MISSING_CREDENTIALS'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Usuário deve ter pelo menos 3 caracteres.',
                code: 'USERNAME_TOO_SHORT'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Senha deve ter pelo menos 6 caracteres.',
                code: 'PASSWORD_TOO_SHORT'
            });
        }

        // Validar role
        const validRoles = ['admin', 'employee'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Role deve ser "admin" ou "employee".',
                code: 'INVALID_ROLE'
            });
        }

        // Hash da senha usando bcrypt assíncrono (10 salt rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário no banco de dados (na mesma loja do usuário logado)
        await dbRun(
            'INSERT INTO users (username, password, role, store_id) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, req.user.store_id]
        );

        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso.',
            user: { username, role, store_id: req.user.store_id }
        });
    } catch (err) {
        console.error('❌ Erro ao registrar usuário:', err.message);

        // Verificar se é erro de constraint UNIQUE
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Este usuário já existe.',
                code: 'USER_ALREADY_EXISTS'
            });
        }

        res.status(500).json({
            success: false,
            error: err.message,
            code: 'REGISTER_ERROR'
        });
    }
};

/**
 * Logout de usuário
 * Limpa o cookie de token
 * @param {object} req - Requisição Express
 * @param {object} res - Resposta Express
 */
const logout = (req, res) => {
    try {
        // Limpar cookie de token
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({
            success: true,
            message: 'Logout realizado com sucesso.'
        });
    } catch (err) {
        console.error('❌ Erro ao fazer logout:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'LOGOUT_ERROR'
        });
    }
};

module.exports = {
    login,
    register,
    logout,
    JWT_SECRET
};