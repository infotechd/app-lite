/*
 Serviço: Upload de Arquivos usando MongoDB GridFS
 ---------------------------------------------------------------------------
 - Responsabilidade: encapsular operações de upload, leitura, listagem e
   remoção de arquivos armazenados no GridFS.
 - Observabilidade: usa logger e loggerUtils para registrar operações e
   sucesso/erro por tipo de ação (CRUD) no bucket de arquivos.
 - Segurança: valida tipo e tamanho antes de enviar; verifique sempre
   permissões ao deletar.
 - Escalabilidade: GridFS divide arquivos em chunks; chunkSizeBytes pode ser
   ajustado via variável de ambiente para equilibrar memória e throughput.
 - Convenções: todos os comentários foram escritos em Português do Brasil.

 Pontos de melhoria (ideias futuras):
 - TODO: adicionar verificação de integridade (checksum/MD5/SHA-256) no upload
   e após o término, armazenando o hash em metadata.
 - TODO: considerar antivírus/clamav/varredura de malware antes de persistir
   o arquivo.
 - TODO: suportar cancelamento/timeout em uploads longos (AbortController) e
   retropressão (backpressure) quando necessário.
 - TODO: deduplicação por hash (evitar salvar o mesmo arquivo repetidas vezes).
 - TODO: assinar URLs de download quando necessário (expiração, escopo) para
   cenários públicos.
*/

import mongoose from 'mongoose';
import { getDatabase } from '../config/database';
import { logger, loggerUtils } from '../utils/logger';
import { BadRequestError, PayloadTooLargeError } from '../utils/errors';

/**
 * Metadados persistidos junto ao arquivo no GridFS.
 */
interface FileMetadata {
    /** Nome original do arquivo enviado pelo cliente */
    originalName: string;
    /** MIME type detectado/fornecido pelo cliente (ex.: image/png) */
    mimetype: string;
    /** Tamanho do arquivo em bytes */
    size: number;
    /** ID do usuário que realizou o upload (opcional) */
    uploadedBy?: string;
    /** Categoria de classificação do arquivo (opcional) */
    categoria?: string;
    /** Descrição livre do arquivo (opcional) */
    descricao?: string;
    /** Data/hora do upload (gerada no backend) */
    uploadedAt: Date;
}

/**
 * Resultado padronizado retornado após um upload com sucesso.
 */
interface UploadResult {
    /** ObjectId do GridFS em formato string */
    fileId: string;
    /** Nome do arquivo salvo no GridFS (único) */
    filename: string;
    /** Metadados salvos juntamente com o arquivo */
    metadata: FileMetadata;
}

/**
 * Serviço de Upload que concentra as operações com GridFS.
 */
export class UploadService {
    /**
     * Obtém uma instância do GridFSBucket usando a conexão do MongoDB atual.
     * - Usa variáveis de ambiente para nome do bucket e tamanho do chunk.
     * - chunkSizeBytes padrão (261120 bytes ~ 255 KB) balanceia custo de I/O e memória.
     *
     * TODO: considerar retry para operações de rede e health check da conexão.
     */
    private getBucket(): mongoose.mongo.GridFSBucket {
        const db = getDatabase();
        return new mongoose.mongo.GridFSBucket(db, {
            bucketName: process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads',
            chunkSizeBytes: parseInt(process.env.GRIDFS_CHUNK_SIZE || '261120')
        });
    }

    /**
     * Upload de arquivo para GridFS.
     *
     * Parâmetros:
     * - buffer: conteúdo binário do arquivo.
     * - filename: nome original (usado como base para o nome único salvo).
     * - metadata: metadados a serem persistidos no GridFS.
     *
     * Retorna: UploadResult contendo o id do arquivo, nome salvo e metadados.
     *
     * Observações:
     * - É gerado um nome único prefixado com timestamp para evitar colisão.
     * - Eventos 'finish' e 'error' do stream definem a resolução/rejeição.
     * - loggerUtils registra a operação de criação no banco para auditoria.
     *
     * TODO: adicionar timeout/cancelamento; calcular checksum e salvar no metadata.
     */
    async uploadToGridFS(
        buffer: Buffer,
        filename: string,
        metadata: FileMetadata
    ): Promise<UploadResult> {
        try {
            const bucket = this.getBucket();

            // Gerar nome único para o arquivo (timestamp + nome original)
            const uniqueFilename = `${Date.now()}_${filename}`;

            // Criar stream de upload para o GridFS com os metadados
            const uploadStream = bucket.openUploadStream(uniqueFilename, {
                metadata
            });

            // Promise para aguardar a conclusão do stream de upload
            const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
                uploadStream.on('finish', () => {
                    // Log de sucesso com dados úteis para auditoria
                    logger.info('Arquivo enviado para GridFS', {
                        fileId: uploadStream.id.toString(),
                        filename: uniqueFilename,
                        size: metadata.size
                    });
                    loggerUtils.logDatabase('create', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, true);

                    // Retornar dados do arquivo salvo
                    resolve({
                        fileId: uploadStream.id.toString(),
                        filename: uniqueFilename,
                        metadata
                    });
                });

                uploadStream.on('error', (error) => {
                    // Log de erro com contexto para troubleshooting
                    logger.error('Erro no upload para GridFS', { error, filename });
                    loggerUtils.logDatabase('create', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, false, error as any);
                    reject(error);
                });
            });

            // Enviar o conteúdo do arquivo para o stream do GridFS
            uploadStream.end(buffer);

            // Esperar o término do upload
            return await uploadPromise;

        } catch (error) {
            // Falhas não relacionadas ao stream (ex.: inicialização do bucket)
            logger.error('Erro no serviço de upload', { error, filename });
            loggerUtils.logDatabase('create', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, false, error as any);
            throw error;
        }
    }

    /**
     * Obter informações de um arquivo no GridFS pelo seu ID.
     * Retorna o documento do arquivo (ou null) conforme o resultado da busca.
     *
     * TODO: tratar caso de ObjectId inválido com BadRequestError.
     * TODO: usar projeção para retornar apenas campos necessários.
     */
    async getFileInfo(fileId: string) {
        try {
            const bucket = this.getBucket();
            const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
            const bucketName = process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads';
            loggerUtils.logDatabase('read', `${bucketName}.files`, true);

            return files.length > 0 ? files[0] : null;

        } catch (error) {
            logger.error('Erro ao obter informações do arquivo', { error, fileId });
            loggerUtils.logDatabase('read', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, false, error as any);
            throw error;
        }
    }

    /**
     * Listar arquivos de um usuário com paginação.
     * - Ordena por data de upload (descendente).
     * - Retorna também informações de paginação (total e totalPages).
     *
     * TODO: validar parâmetros page/limit (mínimos/máximos) antes da consulta.
     * TODO: adicionar filtros por categoria, mimetype e período.
     * TODO: garantir índices adequados em metadata.uploadedBy e uploadDate.
     */
    async getUserFiles(userId: string, page = 1, limit = 10) {
        try {
            const bucket = this.getBucket();
            const skip = (page - 1) * limit;

            const filter = { 'metadata.uploadedBy': userId } as const;

            const files = await bucket
                .find(filter)
                .sort({ uploadDate: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const db = getDatabase();
            const bucketName = process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads';
            const total = await db.collection(`${bucketName}.files`).countDocuments(filter);

            loggerUtils.logDatabase('read', `${bucketName}.files`, true);
            return {
                files: files.map(file => ({
                    fileId: file._id.toString(),
                    filename: file.filename,
                    mimetype: file.metadata?.mimetype,
                    size: file.length,
                    uploadedAt: file.uploadDate,
                    // URL pública para servir o arquivo via endpoint HTTP
                    url: `/api/upload/file/${file._id}`
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Erro ao listar arquivos do usuário', { error, userId });
            loggerUtils.logDatabase('read', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, false, error as any);
            throw error;
        }
    }

    /**
     * Deletar arquivo do GridFS.
     * - Se userId for fornecido, valida se o arquivo pertence ao usuário.
     * - Retorna true em caso de sucesso; false quando não autorizado ou erro controlado.
     *
     * TODO: implementar soft delete (marcação) ao invés de remoção definitiva
     *       para permitir recuperação e auditoria.
     * TODO: registrar auditoria detalhada (quem, quando, motivo) em coleção separada.
     */
    async deleteFile(fileId: string, userId?: string): Promise<boolean> {
        try {
            const bucket = this.getBucket();

            // Verificar se o arquivo existe e se o usuário tem permissão
            if (userId) {
                const file = await this.getFileInfo(fileId);
                if (!file || file.metadata?.uploadedBy !== userId) {
                    return false;
                }
            }

            await bucket.delete(new mongoose.Types.ObjectId(fileId));

            const bucketName = process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads';
            logger.info('Arquivo deletado do GridFS', { fileId, userId });
            loggerUtils.logDatabase('delete', `${bucketName}.files`, true);
            return true;

        } catch (error) {
            logger.error('Erro ao deletar arquivo', { error, fileId, userId });
            loggerUtils.logDatabase('delete', `${process.env.GRIDFS_BUCKET_NAME || 'super_app_uploads'}.files`, false, error as any);
            return false;
        }
    }

    /**
     * Gerar URL pública para arquivo para uso em frontend/API.
     *
     * TODO: considerar URLs assinadas/temporárias para conteúdos sensíveis.
     */
    generateFileUrl(fileId: string): string {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/api/upload/file/${fileId}`;
    }

    /**
     * Validar tipo de arquivo com base na whitelist de MIME types.
     * - Usa a variável de ambiente ALLOWED_FILE_TYPES (separada por vírgulas)
     *   ou um conjunto padrão.
     *
     * TODO: centralizar a lista de tipos aceitos em um módulo de configuração.
     * TODO: complementar com validação por extensão quando apropriado.
     */
    isValidFileType(mimetype: string): boolean {
        const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'video/mp4'
        ];

        return allowedTypes.includes(mimetype);
    }

    /**
     * Validar tamanho do arquivo (bytes) contra o limite máximo.
     * - MAX_FILE_SIZE por padrão é 10 MB (10485760 bytes) se não informado.
     *
     * TODO: expor esse limite em documentação/config e padronizar unidade (MB).
     */
    isValidFileSize(size: number): boolean {
        const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10 MB padrão
        return size <= maxSize;
    }

    /**
     * Upload múltiplo com validação de negócio e I/O.
     * - Valida quantidade, tipo e tamanho antes de iniciar os uploads.
     * - Realiza todos os uploads em paralelo e retorna a lista de resultados.
     *
     * TODO: limitar concorrência (ex.: p-limit) para proteger o servidor.
     * TODO: orquestrar "transação lógica"/rollback em caso de falhas parciais
     *       (ex.: deletar arquivos enviados com sucesso quando outros falharem,
     *       se o caso de uso exigir atomicidade).
     * TODO: incluir dados de correlação (requestId) nos logs para rastreabilidade.
     */
    async uploadMultipleFiles(
        files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
        userId: string,
        categoria?: string,
        descricao?: string
    ): Promise<UploadResult[]> {
        // Regras de negócio e validações fora do try/catch (erros 4xx para cliente)
        if (files.length > 5) {
            throw new BadRequestError(`Limite de 5 arquivos por upload. Recebidos: ${files.length}`);
        }

        for (const file of files) {
            if (!this.isValidFileType(file.mimetype)) {
                throw new BadRequestError(`Tipo de arquivo não permitido: ${file.mimetype}`);
            }
            if (!this.isValidFileSize(file.size)) {
                throw new PayloadTooLargeError(`Arquivo muito grande: ${file.originalname}`);
            }
        }

        // Captura apenas erros de I/O durante o upload em si (5xx)
        try {
            // Enfileirar uploads (Promise.all executa em paralelo)
            const uploadPromises = files.map(file => {
                const metadata: FileMetadata = {
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    uploadedBy: userId,
                    categoria,
                    descricao,
                    uploadedAt: new Date()
                };

                return this.uploadToGridFS(file.buffer, file.originalname, metadata);
            });

            const results = await Promise.all(uploadPromises);

            logger.info('Upload múltiplo realizado', {
                userId,
                filesCount: files.length,
                fileIds: results.map(r => r.fileId)
            });

            return results;
        } catch (error) {
            logger.error('Erro no upload múltiplo', { error, userId });
            throw error;
        }
    }
}

// Exporta uma instância reutilizável do serviço para uso em controllers/rotas
export const uploadService = new UploadService();