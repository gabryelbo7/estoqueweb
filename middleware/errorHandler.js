/**
 * Wrapper para converter erros em funções async para Express
 * Elimina a necessidade de try/catch duplicado em cada controller
 * @param {function} fn - Função async do handler
 * @returns {function} - Função que trata erros automaticamente
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Categorizar tipo de erro para melhor tratamento
 * @param {Error} err - Erro a categorizar
 * @returns {object} - { type, statusCode, message }
 */
const categorizeError = (err) => {
    // Erros de banco de dados
    if (err.code === 'SQLITE_CONSTRAINT' || err.message.includes('UNIQUE constraint')) {
        return {
            type: 'DATABASE_CONSTRAINT',
            statusCode: 409,
            message: 'Violação de constraint do banco de dados',
            userMessage: 'Este dado já existe no sistema'
        };
    }
    
    if (err.message.includes('FOREIGN KEY constraint')) {
        return {
            type: 'DATABASE_FK',
            statusCode: 400,
            message: 'Violação de chave estrangeira',
            userMessage: 'Referência inválida para outro registro'
        };
    }
    
    if (err.code === 'SQLITE_ERROR') {
        return {
            type: 'DATABASE_ERROR',
            statusCode: 500,
            message: 'Erro ao processar query do banco de dados',
            userMessage: 'Erro ao acessar o banco de dados'
        };
    }
    
    // Erros de validação
    if (err.message.includes('obrigatório') || err.message.includes('inválido')) {
        return {
            type: 'VALIDATION_ERROR',
            statusCode: 400,
            message: err.message,
            userMessage: err.message
        };
    }
    
    // Erros de autorização
    if (err.statusCode === 403) {
        return {
            type: 'AUTHORIZATION_ERROR',
            statusCode: 403,
            message: 'Não autorizado',
            userMessage: 'Você não tem permissão para realizar esta ação'
        };
    }
    
    // Erro genérico
    return {
        type: 'INTERNAL_ERROR',
        statusCode: 500,
        message: err.message || 'Erro desconhecido',
        userMessage: 'Ocorreu um erro ao processar sua solicitação'
    };
};

/**
 * Middleware de erro global
 * Trata todos os erros não capturados e retorna resposta JSON padrão
 * Implementa categorização de erros e logging estruturado
 * @param {Error} err - Erro capturado
 * @param {object} req - Requisição Express
 * @param {object} res - Resposta Express
 * @param {function} next - Próximo middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    const errorInfo = categorizeError(err);
    
    // Log estruturado
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: errorInfo.type,
        message: errorInfo.message,
        path: req.path,
        method: req.method,
        user: req.user?.username || 'anonymous',
        ip: req.ip
    };
    
    // Apenas adiciona stack trace em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
        logEntry.stack = err.stack;
    }
    
    console.error('❌ Erro:', JSON.stringify(logEntry, null, 2));

    // Resposta para o cliente (sem exposição de dados sensíveis)
    res.status(errorInfo.statusCode).json({
        success: false,
        error: errorInfo.userMessage,
        code: errorInfo.type,
        timestamp: new Date().toISOString(),
        // Apenas em desenvolvimento: mostrar detalhes técnicos
        ...(process.env.NODE_ENV !== 'production' && { 
            details: {
                message: errorInfo.message,
                stack: err.stack
            }
        })
    });
};

module.exports = {
    asyncHandler,
    globalErrorHandler,
    categorizeError
};
