import { Router } from 'express';
import type { Router as ExpressRouter, RequestHandler } from 'express';
import { register, login, getProfile, getPreferences, updatePreferences, forgotPassword, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/authValidation';

const router: ExpressRouter = Router();

// Wrapper para compatibilidade de tipos com Express
const authLimiterMw: RequestHandler = authLimiter as unknown as RequestHandler;

// Rotas públicas com rate limiting
router.post('/register', authLimiterMw, validate(registerSchema), register);
router.post('/login', authLimiterMw, validate(loginSchema), login);
router.post('/forgot-password', authLimiterMw, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiterMw, validate(resetPasswordSchema), resetPassword);

// Rotas protegidas
router.get('/profile', authMiddleware, getProfile);
router.get('/preferences', authMiddleware, getPreferences);
router.put('/preferences', authMiddleware, updatePreferences);

export default router;