import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadService } from '../services/uploadService';
import { logger } from '../utils/logger';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth';

/**
 * Middleware responsável por configurar cabeçalhos de cache para respostas de mídia.
 * Define cache público por 7 dias e marca como imutável, permitindo melhor performance
 * em CDNs e navegadores.
 *
 * @param req Requisição Express
 * @param res Resposta Express
 * @param next Próximo middleware
 * @returns void
 */
export const setCacheHeaders: RequestHandler = (req, res, next) => {
    // Cache de 7 dias para os arquivos
    const sevenDays = 7 * 24 * 60 * 60;
    res.setHeader('Cache-Control', `public, max-age=${sevenDays}, immutable`);
    next();
};

/**
 * Controller responsável por lidar com uploads de arquivos (imagens e vídeos) para o Cloudinary.
 *
 * CORREÇÕES IMPLEMENTADAS:
 * - Removida validação redundante de duração de vídeo (feita no frontend)
 * - Aumentado limite de tamanho para 100MB (suporta vídeos de até 20 segundos)
 * - Simplificado fluxo de upload para maior confiabilidade
 * - Melhorado tratamento de erros
 */

/**
 * Armazenamento em memória para uploads via Multer.
 * Útil quando o arquivo será imediatamente enviado a um serviço externo (ex.: Cloudinary)
 * sem persistência local.
 */
const storage = multer.memoryStorage();

/**
 * Instância do Multer com:
 * - Limite de tamanho de arquivo (padrão 100MB, configurável via env `MAX_FILE_SIZE`)
 * - Limite de quantidade de arquivos por requisição (padrão 5, via `MAX_FILES_PER_UPLOAD`)
 * - Filtro de tipos permitidos (padrão imagens comuns e vídeos mp4/quicktime, via `ALLOWED_FILE_TYPES`)
 */
const upload = multer({
    storage,
    limits: {
        // ALTERADO: Aumentado de 10MB para 100MB para suportar vídeos de até 20 segundos
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
        files: parseInt(process.env.MAX_FILES_PER_UPLOAD || '5'),
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // Evita warning de variável não utilizada (não precisamos do req aqui)
        void req;

        // Lê os tipos permitidos da variável de ambiente, com fallback para tipos comuns
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/quicktime'
        ]).map(t => t.trim()); // Normaliza espaços em branco

        // Aceita apenas arquivos cujo mimetype esteja na lista permitida
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
});

/**
 * Esquema (Zod) para validar metadados opcionais enviados junto aos arquivos.
 * Mantém contrato claro entre client e server e evita valores inesperados.
 */
const uploadSchema = z.object({
    categoria: z.string().optional(),
    descricao: z.string().optional(),
});

/**
 * Contrato do controlador de upload contendo todos os manipuladores (handlers)
 * expostos para as rotas.
 */
type UploadController = {
    uploadMultiple: RequestHandler;
    uploadFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getUserFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getFileInfo: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};

/**
 * Controlador de Upload responsável por:
 * - Receber múltiplos arquivos (imagens/vídeos) via Multer
 * - Enviar arquivos ao serviço de mídia (Cloudinary)
 * - Listar arquivos do usuário autenticado
 * - Obter informações detalhadas de um arquivo
 * - Deletar arquivos pertencentes ao usuário
 */
export const uploadController: UploadController = {
    /**
     * Middleware do Multer que processa múltiplos arquivos do campo `files`.
     * Aplica limites definidos na instância `upload`.
     */
    uploadMultiple: upload.array('files', 5) as RequestHandler,

    /**
     * Upload de arquivos para Cloudinary.
     * SIMPLIFICADO: Removida validação de duração (feita no frontend)
     *
     * Fluxo:
     * 1) Normaliza `req.files` para um array de arquivos (suporta diferentes formatos do Multer)
     * 2) Valida que há arquivos; valida metadados com Zod
     * 3) Garante que o usuário está autenticado
     * 4) Envia os arquivos ao serviço de upload
     * 5) Mapeia o resultado para um payload consistente e registra logs
     *
     * @param req Requisição autenticada contendo os arquivos e metadados
     * @param res Resposta HTTP com o resultado do upload
     * @param next Próximo middleware em caso de erro
     * @returns Promise<void>
     */
    async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // O Multer pode entregar `req.files` como array OU como objeto indexado por campo.
            // Aqui normalizamos para sempre obter um array de arquivos.
            const filesInput = req.files;
            const files: Express.Multer.File[] = Array.isArray(filesInput)
                ? (filesInput as Express.Multer.File[])
                : filesInput
                    ? Object.values(filesInput as { [fieldname: string]: Express.Multer.File[] }).flat()
                    : [];

            // Garante que pelo menos um arquivo foi enviado
            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo foi enviado'
                });
                return;
            }

            // Valida metadados opcionais (ex.: categoria/descrição)
            const validatedData = uploadSchema.parse(req.body);

            // Garante que o usuário está autenticado (id disponível no token)
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
                return;
            }

            // Envia os arquivos diretamente ao serviço de upload (validação de duração é do frontend)
            const uploadedFiles = await uploadService.uploadMultipleFiles(
                files,
                userId,
                validatedData
            );

            // Log informativo com quantidade de arquivos enviados
            logger.info('upload.success', {
                userId,
                count: uploadedFiles.length
            });

            // Retorna dados essenciais de cada arquivo salvo no provedor
            res.status(200).json({
                success: true,
                data: {
                    files: uploadedFiles.map(f => ({
                        fileId: f.fileId,
                        filename: f.filename,
                        url: f.secureUrl,
                        mimetype: f.mimetype,
                        size: f.size,
                        publicId: f.publicId,
                        resourceType: f.resourceType
                    }))
                }
            });
        } catch (error: any) {
            // Registra erro detalhado e delega para o handler global
            logger.error('upload.error', { error: error.message, stack: error.stack });
            next(error);
        }
    },

    /**
     * Deleta um arquivo do provedor de mídia (Cloudinary) se pertencer ao usuário autenticado.
     *
     * @param req Requisição contendo `publicId` como parâmetro e `resourceType` (query)
     * @param res Resposta com status da exclusão
     * @param next Próximo middleware em caso de erro
     * @returns Promise<void>
     */
    async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // Identificadores do recurso a ser deletado
            const { publicId } = req.params;
            const { resourceType = 'image' } = req.query;

            // Validação básica de entrada
            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: 'Public ID não fornecido'
                });
                return;
            }

            // Verifica propriedade do arquivo, exigindo que o caminho contenha o id do usuário
            const userId = req.user?.id;
            if (!publicId.includes(`app-lite/${userId}`)) {
                res.status(403).json({
                    success: false,
                    message: 'Sem permissão para deletar este arquivo'
                });
                return;
            }

            // Solicita exclusão ao serviço de upload
            const deleted = await uploadService.deleteFile(
                publicId,
                resourceType as 'image' | 'video' | 'raw'
            );

            // Responde conforme o resultado da exclusão
            if (deleted) {
                res.status(200).json({
                    success: true,
                    message: 'Arquivo deletado com sucesso'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Arquivo não encontrado'
                });
            }
        } catch (error: any) {
            // Registra erro e delega ao handler global
            logger.error('delete.error', { error: error.message });
            next(error);
        }
    },

    /**
     * Lista arquivos pertencentes ao usuário autenticado.
     *
     * @param req Requisição autenticada
     * @param res Resposta com a lista de arquivos normalizada para o cliente
     * @param next Próximo middleware em caso de erro
     * @returns Promise<void>
     */
    async getUserFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // Garante autenticação
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
                return;
            }

            // Busca arquivos do usuário no provedor
            const files = await uploadService.listUserFiles(userId);

            // Normaliza campos dos arquivos retornados para o payload do app
            res.status(200).json({
                success: true,
                data: {
                    files: files.map(f => ({
                        fileId: f.public_id,
                        filename: f.context?.originalName || f.public_id,
                        url: f.secure_url,
                        mimetype: f.resource_type,
                        size: f.bytes,
                        createdAt: f.created_at,
                        publicId: f.public_id
                    }))
                }
            });
        } catch (error: any) {
            // Log de erro e delegação
            logger.error('getUserFiles.error', { error: error.message });
            next(error);
        }
    },

    /**
     * Obtém informações detalhadas de um arquivo específico no provedor de mídia.
     *
     * @param req Requisição contendo `publicId` como parâmetro e `resourceType` (query)
     * @param res Resposta com o objeto de metadados do arquivo
     * @param next Próximo middleware em caso de erro
     * @returns Promise<void>
     */
    async getFileInfo(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // Identifica o recurso alvo
            const { publicId } = req.params;
            const { resourceType = 'image' } = req.query;

            // Validação básica
            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: 'Public ID não fornecido'
                });
                return;
            }

            // Recupera metadados diretamente do provedor
            const fileInfo = await uploadService.getFileInfo(
                publicId,
                resourceType as 'image' | 'video' | 'raw'
            );

            // Retorna dados completos do arquivo
            res.status(200).json({
                success: true,
                data: fileInfo
            });
        } catch (error: any) {
            // Log de erro e delegação
            logger.error('getFileInfo.error', { error: error.message });
            next(error);
        }
    }
};

export default uploadController;
