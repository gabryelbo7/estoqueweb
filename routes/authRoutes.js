const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/auth/login
 * Realiza login e retorna JWT token
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha do usuário
 */
router.post('/login', asyncHandler(authController.login));

/**
 * POST /api/auth/register
 * Registra novo usuário no sistema
 * @param {string} username - Nome de usuário (mín. 3 caracteres)
 * @param {string} password - Senha (mín. 6 caracteres)
 * @param {string} role - Papel do usuário (admin|employee)
 */
router.post('/register', asyncHandler(authController.register));

/**
 * POST /api/auth/logout
 * Realiza logout e limpa o cookie de token
 */
router.post('/logout', asyncHandler(authController.logout));

module.exports = router;