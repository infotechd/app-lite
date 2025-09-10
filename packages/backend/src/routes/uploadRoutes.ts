import { Router } from 'express';
import type { RequestHandler } from 'express';
import { uploadController } from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';
import { ensureStorageAvailable } from '../middleware/ensureStorage';
import rateLimit from 'express-rate-limit';

const router: Router = Router();

// Observação: rotas públicas e privadas
// NÃO aplicamos autenticação globalmente aqui para manter o download público.
// A autenticação será aplicada por rota apenas onde necessário.

// Rate limiting específico para upload
const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10, // 10 uploads por 15 minutos
    message: {
        success: false,
        message: 'Muitos uploads. Tente novamente em alguns minutos.'
    }
});

// Wrapper compatível com tipos do Express (resolve TS2769)
const uploadRateLimitMw: RequestHandler = (req, res, next) => {
    return (uploadRateLimit as unknown as RequestHandler)(req, res, next);
};

/**
 * @route   POST /api/upload/files
 * @desc    Upload múltiplo de arquivos para GridFS
 * @access  Private
 * @body    files: File[], categoria?: string, descricao?: string
 */
router.post('/files',
    authMiddleware,
    uploadRateLimitMw,
    ensureStorageAvailable,
    uploadController.uploadMultiple,
    uploadController.uploadFiles
);

/**
 * @route   GET /api/upload/file/:fileId
 * @desc    Download de arquivo do GridFS
 * Acesso: público (visualização de imagens/vídeos)
 * @params  fileId: string
 */
router.get('/file/:fileId', uploadController.downloadFile);

/**
 * @route   GET /api/upload/my-files
 * @desc    Listar arquivos do usuário logado
 * @access  Private
 * @query   page?: number, limit?: number
 */
router.get('/my-files', authMiddleware, ensureStorageAvailable, uploadController.getUserFiles);

/**
 * @route   GET /api/upload/info/:fileId
 * @desc    Obter informações detalhadas do arquivo
 * @access  Private
 * @params  fileId: string
 */
router.get('/info/:fileId', authMiddleware, ensureStorageAvailable, uploadController.getFileInfo);

/**
 * @route   DELETE /api/upload/file/:fileId
 * @desc    Deletar arquivo do GridFS
 * @access  Private
 * @params  fileId: string
 */
router.delete('/file/:fileId', authMiddleware, ensureStorageAvailable, uploadController.deleteFile);

/**
 * @route   POST /api/upload/image
 * @desc    Upload específico para imagens (compatibilidade)
 * @access  Private
 * @body    files: File[]
 */
router.post('/image',
    authMiddleware,
    uploadRateLimitMw,
    ensureStorageAvailable,
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
    ensureStorageAvailable,
    uploadController.uploadMultiple,
    uploadController.uploadFiles
);

export default router;