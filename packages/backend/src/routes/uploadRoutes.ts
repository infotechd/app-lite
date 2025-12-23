import { Router } from 'express';
import type { RequestHandler } from 'express';
import { uploadController, setCacheHeaders } from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';
import rateLimit from 'express-rate-limit';


const router: Router = Router();

// Rate limiting específico para upload
const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10, // 10 uploads por 15 minutos
    message: {
        success: false,
        message: 'Muitos uploads. Tente novamente em alguns minutos.'
    }
});

// Wrapper compatível com tipos do Express
const uploadRateLimitMw: RequestHandler = (req, res, next) => {
    return (uploadRateLimit as unknown as RequestHandler)(req, res, next);
};

/**
 * @route   POST /api/upload/files
 * @desc    Upload múltiplo de arquivos para Cloudinary
 * @access  Private
 * @body    files: File[], categoria?: string, descricao?: string
 */
router.post('/files',
    authMiddleware,
    uploadRateLimitMw,
    uploadController.uploadMultiple,
    uploadController.uploadFiles
);

/**
 * @route   GET /api/upload/files
 * @desc    Listar arquivos do usuário logado
 * @access  Private
 * @query   page?: number, limit?: number
 */
router.get('/files', authMiddleware, uploadController.getUserFiles);

/**
 * @route   GET /api/upload/file/:publicId
 * @desc    Obter informações detalhadas do arquivo
 * @access  Private
 * @params  publicId: string (URL encoded)
 */
router.get('/file/:publicId', authMiddleware, setCacheHeaders, uploadController.getFileInfo);

/**
 * @route   DELETE /api/upload/file/:publicId
 * @desc    Deletar arquivo do Cloudinary
 * @access  Private
 * @params  publicId: string (URL encoded)
 * @query   resourceType?: 'image' | 'video' | 'raw'
 */
router.delete('/file/:publicId', authMiddleware, uploadController.deleteFile);

/**
 * @route   POST /api/upload/image
 * @desc    Upload específico para imagens (compatibilidade)
 * @access  Private
 * @body    files: File[]
 */
router.post('/image',
    authMiddleware,
    uploadRateLimitMw,
    uploadController.uploadMultiple,
    uploadController.uploadFiles
);

/**
 * @route   POST /api/upload/video
 * @desc    Upload específico para vídeos (compatibilidade)
 * @access  Private
 * @body    files: File[]
 */
router.post('/video',
    authMiddleware,
    uploadRateLimitMw,
    uploadController.uploadMultiple,
    uploadController.uploadFiles
);


export default router;
