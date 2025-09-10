import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Ensure MongoDB/GridFS storage is available for routes that depend on it.
 * If unavailable (e.g., SKIP_DB=true or disconnected), respond with 503 using the ApiResponse format.
 */
export function ensureStorageAvailable(req: Request, res: Response, next: NextFunction) {
    const db = getDatabase();
    if (!db) {
        logger.warn('Storage indisponível: tentativa de acessar rota protegida sem DB', {
            path: req.path,
            method: req.method,
            userId: (req as any)?.user?.id,
        });
        return res.status(503).json({
            success: false,
            message: 'Serviço de upload indisponível (banco de dados não conectado)'
        });
    }
    next();
}

export default ensureStorageAvailable;
