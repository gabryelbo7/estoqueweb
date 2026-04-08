const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/products
 * Lista todos os produtos com filtros opcionais
 * @query {string} search - Filtro de busca por nome
 * @query {string} lowStock - Filtro para mostrar apenas produtos com estoque baixo
 */
router.get('/', asyncHandler(productController.getAllProducts));

/**
 * POST /api/products
 * Adiciona novo produto (apenas admin)
 * @body {string} name - Nome do produto
 * @body {number} quantity - Quantidade inicial
 * @body {number} price - Preço do produto
 */
router.post('/', asyncHandler(productController.createProduct));

/**
 * PUT /api/products/:id
 * Atualiza quantidade de um produto (admin pode; employee pode adicionar entrada/saída)
 * @param {number} id - ID do produto
 * @body {number} quantity - Nova quantidade
 */
router.put('/:id', asyncHandler(productController.updateProduct));

/**
 * DELETE /api/products/:id
 * Deleta um produto (apenas admin)
 * @param {number} id - ID do produto
 */
router.delete('/:id', asyncHandler(productController.deleteProduct));

module.exports = router;