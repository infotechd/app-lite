import { Router } from 'express';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { ofertaController } from '../controllers/ofertaController';
import { ofertaFiltersSchema, createOfertaSchema, updateOfertaSchema } from '../validation/ofertaValidation';

const router: Router = Router();

// Públicas
router.get('/', validate(ofertaFiltersSchema), ofertaController.getOfertas);

// Protegidas
router.get('/minhas', authMiddleware, ofertaController.getMinhasOfertas);
router.post('/', authMiddleware, validate(createOfertaSchema), ofertaController.createOferta);
router.put('/:id', authMiddleware, validate(updateOfertaSchema), ofertaController.updateOferta);
router.delete('/:id', authMiddleware, ofertaController.deleteOferta);

// Pública por ID deve vir após rotas específicas
router.get('/:id', ofertaController.getOfertaById);

export default router;