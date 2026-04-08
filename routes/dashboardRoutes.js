const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/dashboard
 * Retorna estatísticas completas do dashboard
 * - Total de produtos
 * - Valor total do estoque
 * - Produtos com estoque baixo (< 5 unidades)
 * Requer autenticação e role employee ou admin
 */
router.get('/', asyncHandler(dashboardController.getDashboard));

module.exports = router;