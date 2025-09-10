import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer, { FileFilterCallback } from 'multer';
import mongoose from 'mongoose';
const { GridFSBucket } = mongoose.mongo;
const { ObjectId } = mongoose.Types;
import { getDatabase } from '../config/database';
import { uploadService } from '../services/uploadService';
import { logger, loggerUtils } from '../utils/logger';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth';

// Utilitário simples para extrair duração de um MP4 a partir do buffer (lê box 'mvhd')
function getMp4DurationSeconds(buffer: Buffer): number | undefined {
    try {
        const mvhdIndex = buffer.indexOf(Buffer.from('mvhd'));
        if (mvhdIndex === -1) return undefined;
        // O header de box tem 4 bytes de tamanho + 4 bytes de tipo ('mvhd')
        const start = mvhdIndex + 4; // aponta para version/flags
        const version = buffer.readUInt8(start);
        if (version === 1) {
            // version(1) usa 64-bit times, pular: version(1)1 + flags(3) + ctime(8) + mtime(8)
            const timescaleOffset = start + 1 + 3 + 8 + 8;
            const timescale = buffer.readUInt32BE(timescaleOffset);
            const durationHigh = buffer.readUInt32BE(timescaleOffset + 4);
            const durationLow = buffer.readUInt32BE(timescaleOffset + 8);
            // Combinar 64-bit (alto/baixo). Como pode exceder Number.MAX_SAFE_INTEGER, aproximamos quando possível.
            const duration = durationHigh * 2 ** 32 + durationLow;
            if (timescale > 0) {
                return duration / timescale;
            }
            return undefined;
        } else {
            // version(0) usa 32-bit times, pular: version(1)1 + flags(3) + ctime(4) + mtime(4)
            const timescaleOffset = start + 1 + 3 + 4 + 4;
            const timescale = buffer.readUInt32BE(timescaleOffset);
            const duration = buffer.readUInt32BE(timescaleOffset + 4);
            if (timescale > 0) {
                return duration / timescale;
            }
            return undefined;
        }
    } catch {
        return undefined;
    }
}

// Configuração do multer para upload em memória
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
        files: parseInt(process.env.MAX_FILES_PER_UPLOAD || '5'),
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        void req;
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'video/mp4'
        ]).map(t => t.trim());

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Rejeita o arquivo sem lançar erro para evitar crash no fluxo do multer
            cb(null, false);
        }
    },
});

// Schema de validação para upload
const uploadSchema = z.object({
    categoria: z.string().optional(),
    descricao: z.string().optional(),
});

type UploadController = {
    uploadMultiple: RequestHandler;
    uploadFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    downloadFile: RequestHandler;
    getUserFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    getFileInfo: RequestHandler;
};

export const uploadController: UploadController = {
    // Middleware para upload múltiplo
    uploadMultiple: upload.array('files', 5) as RequestHandler,

    // Upload de imagens/vídeos para GridFS
    async uploadFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const filesInput = req.files;
            const files: Express.Multer.File[] = Array.isArray(filesInput)
                ? (filesInput as Express.Multer.File[])
                : filesInput
                    ? Object.values(filesInput as { [fieldname: string]: Express.Multer.File[] }).flat()
                    : [];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo foi enviado'
                });
                return;
            }

            // Validar dados adicionais
            const validatedData = uploadSchema.parse(req.body);

            // Validar e filtrar vídeos com duração > 15s (somente MP4)
            const invalidVideos: { name: string; reason: string }[] = [];
            const validFiles = files.filter((file) => {
                if (file.mimetype === 'video/mp4') {
                    const dur = getMp4DurationSeconds(file.buffer);
                    if (typeof dur === 'number' && dur > 15) {
                        invalidVideos.push({ name: file.originalname, reason: `duração ${dur.toFixed(1)}s > 15s` });
                        return false;
                    }
                }
                return true;
            });

            if (validFiles.length === 0) {
                res.status(400).json({
                    success: false,
                    message: invalidVideos.length
                        ? `Nenhum arquivo válido. Vídeos inválidos: ${invalidVideos.map(v => v.name).join(', ')}`
                        : 'Nenhum arquivo válido',
                });
                return;
            }

            // Verificar disponibilidade do storage/DB (defesa em profundidade)
            const db = getDatabase();
            if (!db) {
                logger.warn('Upload endpoint sem DB (SKIP_DB ou desconectado)');
                res.status(503).json({
                    success: false,
                    message: 'Serviço de upload indisponível (banco de dados não conectado)'
                });
                return;
            }

            // Fazer upload de cada arquivo válido para GridFS
            const uploadPromises = validFiles.map(async (file) => {
                const metadata = {
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    uploadedBy: req.user?.id,
                    categoria: validatedData.categoria,
                    descricao: validatedData.descricao,
                    uploadedAt: new Date(),
                };

                return await uploadService.uploadToGridFS(file.buffer, file.originalname, metadata);
            });

            const uploadResults = await Promise.all(uploadPromises);

            logger.info('Upload realizado com sucesso', {
                userId: req.user?.id,
                filesCount: validFiles.length,
                fileIds: uploadResults.map(r => r.fileId)
            });

            // Telemetria de upload padronizada
            loggerUtils.logUpload(req.user?.id, validFiles, true);

            res.status(201).json({
                success: true,
                message: invalidVideos.length
                    ? `Arquivos enviados com sucesso. Alguns vídeos foram ignorados por exceder 15s: ${invalidVideos.map(v => v.name).join(', ')}`
                    : 'Arquivos enviados com sucesso',
                data: {
                    files: uploadResults.map(result => {
                        const origin = `${req.protocol}://${req.get('host')}`;
                        return {
                            fileId: result.fileId,
                            filename: result.filename,
                            url: `${origin}/api/upload/file/${result.fileId}`,
                            mimetype: result.metadata.mimetype,
                            size: result.metadata.size
                        };
                    })
                }
            });

        } catch (error) {
            logger.error('Erro no upload de arquivos', { error, userId: req.user?.id });
            // Telemetria de upload com falha (não bloquear fluxo por erro de log)
            try {
                const filesInput = req.files as any;
                const files: Express.Multer.File[] = Array.isArray(filesInput)
                    ? (filesInput as Express.Multer.File[])
                    : filesInput
                        ? Object.values(filesInput as { [fieldname: string]: Express.Multer.File[] }).flat()
                        : [];
                loggerUtils.logUpload(req.user?.id, files, false);
            } catch {}
            next(error);
        }
    },

    // Download de arquivo do GridFS
    async downloadFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileId } = req.params;

            if (!ObjectId.isValid(fileId)) {
                res.status(400).json({
                    success: false,
                    message: 'ID de arquivo inválido'
                });
                return;
            }

            const db = getDatabase();
            if (!db) {
                logger.warn('Download de mídia solicitado, porém storage indisponível (sem DB)');
                res.status(503).json({
                    success: false,
                    message: 'Armazenamento de mídias indisponível no momento'
                });
                return;
            }
            const bucket = new GridFSBucket(db, {
                bucketName: process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'
            });

            // Buscar informações do arquivo
            const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();

            if (files.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Arquivo não encontrado'
                });
                return;
            }

            const file = files[0];

            const mime = file.metadata?.mimetype || 'application/octet-stream';
            const fileSize = file.length as number;
            const range = req.headers.range;

            res.set({
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000'
            });

            if (range) {
                // Suporta "bytes=start-" e "bytes=start-end" com validação completa
                const match = /^bytes=(\d+)-(\d+)?$/i.exec(range);
                if (!match) {
                    res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end();
                    return;
                }

                let start = parseInt(match[1], 10);
                let end = typeof match[2] !== 'undefined'
                    ? Math.min(parseInt(match[2], 10), Math.max(fileSize - 1, 0))
                    : Math.max(fileSize - 1, 0);

                // Sanitizações
                if (!Number.isFinite(start) || start < 0) start = 0;
                if (!Number.isFinite(end) || end < 0) end = Math.max(fileSize - 1, 0);

                if (start > end || start >= fileSize) {
                    res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end();
                    return;
                }

                const chunkSize = end - start + 1;

                res.status(206);
                res.set({
                    'Content-Type': mime,
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Content-Length': `${chunkSize}`,
                    'Content-Disposition': `inline; filename="${file.filename}"`
                });

                const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), { start, end });
                downloadStream.on('error', (error: any) => {
                    logger.error('Erro no download (range) do arquivo', { error: error?.message || String(error), fileId });
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: 'Erro ao baixar arquivo' });
                    } else {
                        try { res.end(); } catch {}
                    }
                    try { downloadStream.destroy(); } catch {}
                });
                downloadStream.pipe(res);
            } else {
                res.set({
                    'Content-Type': mime,
                    'Content-Length': fileSize.toString(),
                    'Content-Disposition': `inline; filename="${file.filename}"`
                });
                const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
                downloadStream.on('error', (error: any) => {
                    logger.error('Erro no download do arquivo', { error: error?.message || String(error), fileId });
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: 'Erro ao baixar arquivo' });
                    } else {
                        try { res.end(); } catch {}
                    }
                    try { downloadStream.destroy(); } catch {}
                });
                downloadStream.pipe(res);
            }

        } catch (error) {
            logger.error('Erro no download de arquivo', { error, fileId: req.params.fileId });
            next(error);
        }
    },

    // Listar arquivos do usuário
    async getUserFiles(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Não autenticado'
                });
                return;
            }

            const files = await uploadService.getUserFiles(userId, page, limit);

            res.json({
                success: true,
                data: files
            });

        } catch (error) {
            logger.error('Erro ao listar arquivos do usuário', { error, userId: req.user?.id });
            next(error);
        }
    },

    // Deletar arquivo
    async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { fileId } = req.params;
            const userId = req.user?.id;

            if (!ObjectId.isValid(fileId)) {
                res.status(400).json({
                    success: false,
                    message: 'ID de arquivo inválido'
                });
                return;
            }

            const deleted = await uploadService.deleteFile(fileId, userId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Arquivo não encontrado ou sem permissão'
                });
                return;
            }

            logger.info('Arquivo deletado com sucesso', { fileId, userId });

            res.json({
                success: true,
                message: 'Arquivo deletado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao deletar arquivo', { error, fileId: req.params.fileId, userId: req.user?.id });
            next(error);
        }
    },

    // Obter informações do arquivo
    async getFileInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileId } = req.params;

            if (!ObjectId.isValid(fileId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de arquivo inválido'
                });
            }

            const fileInfo = await uploadService.getFileInfo(fileId);

            if (!fileInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'Arquivo não encontrado'
                });
            }

            res.json({
                success: true,
                data: {
                    fileId: fileInfo._id,
                    filename: fileInfo.filename,
                    mimetype: fileInfo.metadata?.mimetype,
                    size: fileInfo.length,
                    uploadedAt: fileInfo.uploadDate,
                    metadata: fileInfo.metadata
                }
            });

        } catch (error) {
            logger.error('Erro ao obter informações do arquivo', { error, fileId: req.params.fileId });
            next(error);
        }
    }
};