const { dbGet, dbAll } = require('../database');

/**
 * Obter estatísticas completas do dashboard
 * Executa 3 queries em paralelo usando Promise.all para melhor performance
 * @param {object} req - Requisição Express
 * @param {object} res - Resposta Express
 */
const getDashboard = async (req, res) => {
    try {
        // Executar as 3 queries em paralelo para melhor performance
        const [totalStats, estockValue, lowStockProducts] = await Promise.all([
            // Query 1: Total de produtos
            dbGet('SELECT COUNT(*) as totalProdutos FROM products'),
            
            // Query 2: Valor total do estoque
            dbGet('SELECT SUM(price * quantity) as valorTotalEstoque FROM products'),
            
            // Query 3: Produtos com estoque baixo (quantidade < 5)
            dbAll(
                `SELECT id, name, quantity, price, (price * quantity) as valorProduto
                 FROM products
                 WHERE quantity < 5
                 ORDER BY quantity ASC`
            )
        ]);

        // Preparar dados da resposta
        const dashboardData = {
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalProdutos: totalStats?.totalProdutos || 0,
                valorTotalEstoque: estockValue?.valorTotalEstoque || 0,
                produtosComEstoqueBaixo: (lowStockProducts || []).length
            },
            details: {
                produtosDetalhes: lowStockProducts || [],
                totalLinhasEstoque: (lowStockProducts || []).reduce((sum, p) => sum + p.quantity, 0),
                valorEmEstoqueBaixo: (lowStockProducts || []).reduce((sum, p) => sum + (p.valorProduto || 0), 0)
            }
        };

        res.json(dashboardData);
    } catch (err) {
        console.error('❌ Erro ao obter dashboard:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            code: 'DASHBOARD_ERROR'
        });
    }
};

module.exports = {
    getDashboard
};