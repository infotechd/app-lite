import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { ofertaController } from '../controllers/ofertaController';
import { ofertaFiltersSchema, createOfertaSchema, updateOfertaSchema } from '../validation/ofertaValidation';
import rateLimit from 'express-rate-limit';

const router: Router = Router();

// Rate limiting específico para busca de ofertas (janela curta)
const ofertasRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    limit: 120, // até 120 requisições/min por IP
    standardHeaders: true,
    legacyHeaders: false,
});
// Wrapper compatível com tipos do Express
const ofertasRateLimitMw: RequestHandler = (req, res, next) => {
    return (ofertasRateLimit as unknown as RequestHandler)(req, res, next);
};

// Públicas
router.get('/', ofertasRateLimitMw, validate(ofertaFiltersSchema), ofertaController.getOfertas);

// Protegidas
router.get('/minhas', authMiddleware, ofertaController.getMinhasOfertas);
router.post('/', authMiddleware, validate(createOfertaSchema), ofertaController.createOferta);
router.put('/:id', authMiddleware, validate(updateOfertaSchema), ofertaController.updateOferta);
router.delete('/:id', authMiddleware, ofertaController.deleteOferta);

// Pública por ID deve vir após rotas específicas
router.get('/:id', ofertaController.getOfertaById);

export default router;