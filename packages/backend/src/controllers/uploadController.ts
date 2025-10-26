import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadService } from '../services/uploadService';
import { logger } from '../utils/logger';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth';

/**
 * Controller responsável por lidar com uploads de arquivos (imagens e vídeos) para o provedor (Cloudinary),
 * assim como listar, obter informações e deletar arquivos do usuário autenticado.
 *
 * Pontos principais:
 * - Usa Multer com storage em memória (memoryStorage) para receber os arquivos via multipart/form-data.
 * - Faz validação de tamanho, quantidade e tipos de arquivos via configuração do Multer e variáveis de ambiente.
 * - Rejeita vídeos com duração maior que 15 segundos (extraindo duração diretamente do buffer MP4).
 * - Depende de uploadService para operações com o provedor externo (upload/listagem/remoção/consulta).
 * - Utiliza zod para validar dados adicionais recebidos junto aos arquivos.
 * - Registra eventos e erros via logger centralizado.
 *
 * Variáveis de ambiente utilizadas (com padrão):
 * - MAX_FILE_SIZE: tamanho máximo de cada arquivo em bytes (padrão 10MB = 10485760).
 * - MAX_FILES_PER_UPLOAD: quantidade máxima de arquivos por requisição (padrão 5).
 * - ALLOWED_FILE_TYPES: lista separada por vírgula de MIME types permitidos.
 *
 * Possíveis melhorias futuras (TODO):
 * - Trocar a verificação de duração de vídeo para uma solução baseada em ffprobe/MediaInfo para suportar mais containers e codecs.
 * - Implementar upload em streaming/chunks (resumable) para suportar arquivos maiores sem estourar memória.
 * - Adicionar verificação antivírus/antimalware (ex.: ClamAV) antes de enviar ao provedor.
 * - Implementar limites por usuário (rate limit/quotas) e observar governança de armazenamento por plano.
 * - Gerar thumbnails e variações de imagens/vídeos no backend (ou via transformações do provedor) e retornar no payload.
 * - Paginação e filtros em getUserFiles (por tipo, data, tamanho) e caching quando aplicável.
 * - Auditoria detalhada (quem enviou/deletou/visualizou) e trilhas de auditoria.
 */

/**
 * Extrai a duração (em segundos) de um arquivo MP4 a partir do buffer.
 *
 * Observação: esta função faz um parse simples do box 'mvhd' do container MP4 e
 * pode não funcionar para todos os formatos/variações. Para produção, considere
 * usar ferramentas robustas (ffprobe) para obter metadados de mídia.
 */
function getMp4DurationSeconds(buffer: Buffer): number | undefined {
    try {
        // Procura o box 'mvhd' no container MP4
        const mvhdIndex = buffer.indexOf(Buffer.from('mvhd'));
        if (mvhdIndex === -1) return undefined;

        // O byte seguinte ao 'mvhd' indica a versão do header (0 ou 1)
        const start = mvhdIndex + 4;
        const version = buffer.readUInt8(start);

        if (version === 1) {
            // Versão 1 utiliza campos de 64 bits para tempos
            const timescaleOffset = start + 1 + 3 + 8 + 8; // version(1) + flags(3) + creation(8) + modification(8)
            const timescale = buffer.readUInt32BE(timescaleOffset);
            const durationHigh = buffer.readUInt32BE(timescaleOffset + 4);
            const durationLow = buffer.readUInt32BE(timescaleOffset + 8);
            const duration = durationHigh * 2 ** 32 + durationLow; // concatenação 64 bits
            if (timescale > 0) {
                return duration / timescale; // duração em segundos
            }
            return undefined;
        } else {
            // Versão 0 utiliza campos de 32 bits para tempos
            const timescaleOffset = start + 1 + 3 + 4 + 4; // version(1) + flags(3) + creation(4) + modification(4)
            const timescale = buffer.readUInt32BE(timescaleOffset);
            const duration = buffer.readUInt32BE(timescaleOffset + 4);
            if (timescale > 0) {
                return duration / timescale; // duração em segundos
            }
            return undefined;
        }
    } catch {
        // Em qualquer erro de leitura/parsing, retornamos undefined e tratamos acima
        return undefined;
    }
}

// Configuração do multer para upload em memória (os buffers ficam no processo Node)
// ATENÇÃO: para arquivos grandes ou alto volume, prefira storage em disco ou streaming direto ao provedor
const storage = multer.memoryStorage();

// Instância do Multer com limites e filtro de tipos de arquivo
const upload = multer({
    storage,
    limits: {
        // Tamanho máximo por arquivo, podendo ser configurado via env (padrão 10MB)
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
        // Quantidade máxima de arquivos por requisição
        files: parseInt(process.env.MAX_FILES_PER_UPLOAD || '5'),
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // req não é utilizado aqui; evitamos warning de variável não usada
        void req;
        // Tipos permitidos: lidos da env ou defaults seguros
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/quicktime'
        ]).map(t => t.trim());

        // Apenas aceita se o mimetype estiver permitido; do contrário, ignora o arquivo
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Poderíamos retornar um erro para feedback mais explícito (TODO);
            // por ora, apenas marcamos como rejeitado (false)
            cb(null, false);
        }
    },
});

// Esquema de validação para metadados opcionais enviados junto aos arquivos
const uploadSchema = z.object({
    categoria: z.string().optional(), // Ex.: "avatar", "galeria", "documento"
    descricao: z.string().optional(), // Texto descritivo do upload
});

// Interface do controller: define assinatura dos handlers
type UploadController = {
    // Middleware do Multer para aceitar múltiplos arquivos no campo 'files'
    uploadMultiple: RequestHandler;
    // Handler para realizar upload
    uploadFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    // Handler para deletar arquivo
    deleteFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    // Handler para listar arquivos do usuário
    getUserFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    // Handler para obter informações pontuais de um arquivo
    getFileInfo: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};

export const uploadController: UploadController = {
    // Aceita até 5 arquivos no campo 'files'. Este middleware popula req.files
    uploadMultiple: upload.array('files', 5) as RequestHandler,

    /**
     * Upload de arquivos para Cloudinary.
     * Fluxo:
     * 1) Normaliza req.files em um array de arquivos
     * 2) Valida presença de arquivos e metadados (zod)
     * 3) Rejeita vídeos com duração > 15s
     * 4) Garante usuário autenticado
     * 5) Envia arquivos válidos via uploadService
     * 6) Retorna payload com dados dos uploads e vídeos inválidos (se houver)
     */
    async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            // req.files pode ser array (quando um único campo) ou um objeto (vários campos)
            const filesInput = req.files;
            const files: Express.Multer.File[] = Array.isArray(filesInput)
                ? (filesInput as Express.Multer.File[])
                : filesInput
                    ? Object.values(filesInput as { [fieldname: string]: Express.Multer.File[] }).flat()
                    : [];

            // Sem arquivos => 400
            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo foi enviado'
                });
                return;
            }

            // Validar dados adicionais via zod; dispara se inválido
            const validatedData = uploadSchema.parse(req.body);

            // Regras de negócio: rejeitar vídeos com duração superior a 15s
            const invalidVideos: { name: string; reason: string }[] = [];
            const validFiles = files.filter((file) => {
                if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime') {
                    const dur = getMp4DurationSeconds(file.buffer);
                    if (typeof dur === 'number' && dur > 15) {
                        invalidVideos.push({
                            name: file.originalname,
                            reason: `duração ${dur.toFixed(1)}s > 15s`
                        });
                        return false; // exclui da lista a ser enviada
                    }
                }
                return true;
            });

            // Se após os filtros não sobrou nada, retorna 400 informando o motivo
            if (validFiles.length === 0) {
                res.status(400).json({
                    success: false,
                    message: invalidVideos.length
                        ? `Nenhum arquivo válido. Vídeos inválidos: ${invalidVideos.map(v => v.name).join(', ')}`
                        : 'Nenhum arquivo válido',
                });
                return;
            }

            // Checagem de autenticação (req.user preenchido por middleware de auth)
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
                return;
            }

            // Dispara upload para o provedor via service. validatedData pode levar metadados
            const uploadedFiles = await uploadService.uploadMultipleFiles(
                validFiles,
                userId,
                validatedData
            );

            // Log útil para observabilidade
            logger.info('upload.success', {
                userId,
                count: uploadedFiles.length,
                invalidCount: invalidVideos.length
            });

            // Resposta padronizada com os campos essenciais de cada arquivo
            res.status(200).json({
                success: true,
                data: {
                    files: uploadedFiles.map(f => ({
                        fileId: f.fileId,
                        filename: f.filename,
                        url: f.secureUrl, // Usar URL segura (HTTPS)
                        mimetype: f.mimetype,
                        size: f.size,
                        publicId: f.publicId,
                        resourceType: f.resourceType
                    })),
                    // Retornamos a lista de vídeos inválidos (se houver) para feedback no cliente
                    invalidVideos: invalidVideos.length > 0 ? invalidVideos : undefined
                }
            });
        } catch (error: any) {
            // Encaminhamos o erro para o middleware de erro global
            logger.error('upload.error', { error: error.message, stack: error.stack });
            next(error);
        }
    },

    /**
     * Deletar arquivo do Cloudinary.
     * Requer:
     * - publicId no path param
     * - resourceType opcional (image | video | raw), padrão image
     * - Garantia de que o arquivo pertence ao usuário autenticado
     */
    async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { publicId } = req.params;
            const { resourceType = 'image' } = req.query;

            // Validação de parâmetros obrigatórios
            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: 'Public ID não fornecido'
                });
                return;
            }

            // Verificar se o arquivo pertence ao usuário (convenção do caminho no Cloudinary)
            const userId = req.user?.id;
            if (!publicId.includes(`app-lite/${userId}`)) {
                res.status(403).json({
                    success: false,
                    message: 'Sem permissão para deletar este arquivo'
                });
                return;
            }

            // Solicita remoção ao service
            const deleted = await uploadService.deleteFile(
                publicId,
                resourceType as 'image' | 'video' | 'raw'
            );

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
            logger.error('delete.error', { error: error.message });
            next(error);
        }
    },

    /**
     * Listar arquivos do usuário.
     * Requer usuário autenticado. Retorna lista com metadados essenciais.
     * TODO: adicionar paginação, ordenação e filtros (tipo, data, tamanho), além de cache quando possível.
     */
    async getUserFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
                return;
            }

            // Busca via service. Idealmente suportar paginação (cursor/offset + limit) no futuro
            const files = await uploadService.listUserFiles(userId);

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
            logger.error('getUserFiles.error', { error: error.message });
            next(error);
        }
    },

    /**
     * Obter informações de um arquivo específico no provedor.
     * Requer publicId e, opcionalmente, resourceType.
     * Útil para checar metadados após o upload ou antes de exibir/transformar no cliente.
     */
    async getFileInfo(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { publicId } = req.params;
            const { resourceType = 'image' } = req.query;

            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: 'Public ID não fornecido'
                });
                return;
            }

            const fileInfo = await uploadService.getFileInfo(
                publicId,
                resourceType as 'image' | 'video' | 'raw'
            );

            res.status(200).json({
                success: true,
                data: fileInfo
            });
        } catch (error: any) {
            logger.error('getFileInfo.error', { error: error.message });
            next(error);
        }
    }
};

export default uploadController;

