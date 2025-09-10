import { Router } from 'express';
import type { Router as ExpressRouter, Request, Response, RequestHandler } from 'express';
import authRoutes from './authRoutes';
import uploadRoutes from './uploadRoutes';
import ofertaRoutes from './ofertaRoutes';
import { generalLimiter } from '../middleware/rateLimiter';
import config from '../config';
import { isDbReady } from '../config/database';

const router: ExpressRouter = Router();

// Rate limiting geral (wrapper para compatibilidade de tipos)
const generalLimiterMw: RequestHandler = generalLimiter as unknown as RequestHandler;
router.use(generalLimiterMw);

// Rotas da API
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/ofertas', ofertaRoutes);

// Rota de health check (formato ApiResponse)
router.get('/health', ({}: Request, res: Response) => {
    const dbConnected = isDbReady();
    const skipDb = config.SKIP_DB;
    res.json({
        success: true,
        message: 'Super App API funcionando!',
        data: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            dbConnected,
            skipDb,
        }
    });
});

export default router;