import { Router } from 'express';
import multer from 'multer';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router: Router = Router();

/**
 * Configuração do Multer específica e segura para avatares
 * - Armazenamento em memória para repasse ao Cloudinary
 * - Limite de 5MB
 * - Apenas JPEG e PNG permitidos
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem inválido. Apenas JPEG e PNG são permitidos.'));
    }
  },
});

// Atualiza (ou adiciona) a foto de perfil do usuário autenticado
router.patch(
  '/me/avatar',
  authMiddleware,
  avatarUpload.single('avatar'),
  userController.updateAvatar
);

// Remove a foto de perfil do usuário autenticado
router.delete('/me/avatar', authMiddleware, userController.removeAvatar);

// Atualiza o nome do usuário autenticado
router.patch('/me/nome', authMiddleware, ...userController.updateName);

// Atualiza o telefone do usuário autenticado
router.patch('/me/telefone', authMiddleware, ...userController.updatePhone);

// Atualiza a localização do usuário autenticado
router.patch('/me/localizacao', authMiddleware, ...userController.updateLocation);

export default router;
