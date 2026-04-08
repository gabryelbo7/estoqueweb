const { dbRun, dbGet, dbAll } = require('../database');

/**
 * Função para registrar log de auditoria
 * @param {number} userId - ID do usuário que realizou a ação
 * @param {string} action - Tipo de ação (CREATE, UPDATE, DELETE)
 * @param {string} tableName - Nome da tabela afetada
 * @param {number} recordId - ID do registro afetado
 * @param {object} oldValues - Valores antigos (para UPDATE/DELETE)
 * @param {object} newValues - Valores novos (para CREATE/UPDATE)
 */
const logAudit = async (userId, action, tableName, recordId, oldValues = null, newValues = null) => {
    const sql = 'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)';
    return dbRun(sql, [userId, action, tableName, recordId, JSON.stringify(oldValues), JSON.stringify(newValues)]);
};

/**
 * Listar todos os produtos com filtros de busca e estoque baixo
 * @param {object} req - Requisição Express (query: search, lowStock)
 * @param {object} res - Resposta Express
 */
const getAllProducts = async (req, res) => {
    try {
        const { search, lowStock } = req.query;
        let sql = 'SELECT * FROM products';
        let params = [];
        let conditions = [];

        // ✅ FILTRAR POR STORE_ID DO USUÁRIO LOGADO
        conditions.push('store_id = ?');
        params.push(req.user.store_id);

        // Construir SQL dinamicamente
        if (search) {
            conditions.push('name LIKE ?');
            params.push(`%${search}%`);
        }

        if (lowStock === 'true') {
            conditions.push('quantity < 5');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY id DESC';

        const rows = await dbAll(sql, params);
        res.json({ 
            success: true, 
            data: rows,
            count: rows.length 
        });
    } catch (err) {
        console.error('❌ Erro ao listar produtos:', err.message);
        res.status(500).json({ 
            success: false,
            error: err.message, 
            code: 'FETCH_PRODUCTS_ERROR' 
        });
    }
};

/**
 * Adicionar novo produto
 * Usa Promise.all para executar validações e inserts em paralelo
 * @param {object} req - Requisição Express (body: name, quantity, price)
 * @param {object} res - Resposta Express
 */
const createProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;

        // ========================================
        // VALIDAÇÕES
        // ========================================
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Nome é obrigatório e deve ser uma string não vazia.',
                code: 'INVALID_NAME'
            });
        }
        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Quantidade deve ser um número maior ou igual a 0.',
                code: 'INVALID_QUANTITY'
            });
        }
        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Preço deve ser um número maior que 0.',
                code: 'INVALID_PRICE'
            });
        }

        // ========================================
        // VERIFICAÇÃO DE DUPLICATA (em paralelo com validação)
        // ========================================
        const existingProduct = await dbGet(
            'SELECT id FROM products WHERE name = ? AND store_id = ?', 
            [name.trim(), req.user.store_id]
        );
        
        if (existingProduct) {
            return res.status(409).json({ 
                success: false,
                error: 'Já existe um produto com este nome nesta loja.',
                code: 'PRODUCT_ALREADY_EXISTS'
            });
        }

        // ========================================
        // INSERT + LOG + MOVIMENTAÇÃO (em paralelo)
        // ========================================
        
        // 1️⃣ Inserir produto
        const insertResult = await dbRun(
            'INSERT INTO products (name, quantity, price, store_id) VALUES (?, ?, ?, ?)',
            [name.trim(), quantity, price, req.user.store_id]
        );

        const productId = insertResult.lastID;

        const stockMovementPromise = quantity > 0
            ? dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [productId, 'IN', quantity]
            )
            : Promise.resolve();

        const auditPromise = logAudit(
            req.user.id,
            'CREATE',
            'products',
            productId,
            null,
            { name: name.trim(), quantity, price }
        );

        const results = await Promise.allSettled([stockMovementPromise, auditPromise]);
        results
            .filter((result) => result.status === 'rejected')
            .forEach((result) => console.error('⚠️ Erro assíncrono pós-criação:', result.reason?.message || result.reason));

        res.status(201).json({
            success: true,
            message: 'Produto adicionado com sucesso',
            data: {
                id: productId,
                name: name.trim(),
                quantity,
                price
            }
        });
    } catch (err) {
        console.error('❌ Erro ao criar produto:', err.message);
        
        // Verificar se é erro de constraint de banco de dados
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ 
                success: false,
                error: 'Já existe um produto com este nome.',
                code: 'DUPLICATE_PRODUCT'
            });
        }

        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'CREATE_PRODUCT_ERROR'
        });
    }
};

/**
 * Atualizar quantidade de um produto
 * Usa Promise.all para executar UPDATE + LOG + MOVIMENTAÇÃO em paralelo
 * @param {object} req - Requisição Express (params: id, body: quantity)
 * @param {object} res - Resposta Express
 */
const updateProduct = async (req, res) => {
    try {
        const { quantity: newQuantity } = req.body;
        const productId = req.params.id;

        // ========================================
        // VALIDAÇÕES
        // ========================================
        if (typeof newQuantity !== 'number' || newQuantity < 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Quantidade deve ser um número maior ou igual a 0.',
                code: 'INVALID_QUANTITY'
            });
        }

        // ========================================
        // BUSCAR PRODUTO
        // ========================================
        const product = await dbGet(
            'SELECT quantity FROM products WHERE id = ? AND store_id = ?', 
            [productId, req.user.store_id]
        );
        
        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: 'Produto não encontrado nesta loja.',
                code: 'PRODUCT_NOT_FOUND'
            });
        }

        const currentQuantity = product.quantity;
        const difference = newQuantity - currentQuantity;

        // Se quantidade é igual, retornar sucesso
        if (difference === 0) {
            return res.json({ 
                success: true,
                message: 'Quantidade já está atualizada.',
                changes: 0 
            });
        }

        // ========================================
        // UPDATE + LOG + MOVIMENTAÇÃO (em paralelo)
        // ========================================
        const [updateResult] = await Promise.all([
            dbRun(
                'UPDATE products SET quantity = ? WHERE id = ?',
                [newQuantity, productId]
            ),
            dbRun(
                'INSERT INTO stock_movements (product_id, type, quantity) VALUES (?, ?, ?)',
                [productId, difference > 0 ? 'IN' : 'OUT', Math.abs(difference)]
            ),
            logAudit(
                req.user.id,
                'UPDATE',
                'products',
                productId,
                { quantity: currentQuantity },
                { quantity: newQuantity }
            )
        ]);

        // ✅ Responder com todos os dados
        res.json({ 
            success: true,
            message: 'Quantidade atualizada com sucesso',
            data: {
                id: productId,
                newQuantity,
                difference,
                changes: updateResult.changes
            }
        });
    } catch (err) {
        console.error('❌ Erro ao atualizar produto:', err.message);
        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'UPDATE_PRODUCT_ERROR'
        });
    }
};

/**
 * Excluir produto
 * Usa Promise.all para executar DELETE + LOG em paralelo
 * @param {object} req - Requisição Express (params: id)
 * @param {object} res - Resposta Express
 */
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // ========================================
        // BUSCAR PRODUTO (para capturar valores antigos)
        // ========================================
        const product = await dbGet(
            'SELECT * FROM products WHERE id = ? AND store_id = ?', 
            [productId, req.user.store_id]
        );

        if (!product) {
            return res.status(404).json({ 
                success: false,
                error: 'Produto não encontrado nesta loja.',
                code: 'PRODUCT_NOT_FOUND'
            });
        }

        const oldValues = {
            name: product.name,
            quantity: product.quantity,
            price: product.price
        };

        // ========================================
        // DELETE + LOG (em paralelo)
        // ========================================
        const [deleteResult] = await Promise.all([
            dbRun(
                'DELETE FROM products WHERE id = ?',
                [productId]
            ),
            logAudit(
                req.user.id,
                'DELETE',
                'products',
                productId,
                oldValues,
                null
            )
        ]);

        res.json({ 
            success: true,
            message: 'Produto excluído com sucesso',
            data: {
                id: productId,
                changes: deleteResult.changes
            }
        });
    } catch (err) {
        console.error('❌ Erro ao excluir produto:', err.message);
        res.status(500).json({ 
            success: false,
            error: err.message,
            code: 'DELETE_PRODUCT_ERROR'
        });
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct
};