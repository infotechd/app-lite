/*
  Serviço de Upload para Cloudinary
  - Este módulo centraliza operações de envio, listagem, informação e exclusão
    de arquivos no Cloudinary usando a SDK v2.
  - Escrito em TypeScript, voltado para uso com Multer (buffer em memória).

  Requisitos de ambiente (.env):
  - CLOUDINARY_CLOUD_NAME: nome do cloud
  - CLOUDINARY_API_KEY: chave pública da API
  - CLOUDINARY_API_SECRET: segredo da API

  Observações de segurança e operação:
  - Certifique-se de não commitar as variáveis de ambiente.
  - Em produção, prefira credenciais restritas por escopo e use regras de segurança do Cloudinary.
  - O serviço usa streaming para evitar carregar arquivos inteiros em memória durante o upload.
*/

import { v2 as cloudinary } from 'cloudinary'; // SDK oficial do Cloudinary v2
import { Readable } from 'stream'; // Utilizado para converter Buffer em Stream
import { logger } from '../utils/logger'; // Logger centralizado da aplicação

// Configurar Cloudinary com variáveis de ambiente
// Possível melhoria: validar se as variáveis existem e lançar erro amigável em caso de ausência.
// Ex.: se alguma variável estiver faltando, logar e encerrar a inicialização do serviço.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Interface que padroniza o retorno após upload
// Possível melhoria: separar tipos por resourceType (image/video/raw) se houver campos específicos.
export interface UploadedFile {
    fileId: string;        // Identificador do arquivo (usamos public_id do Cloudinary)
    filename: string;      // Nome original do arquivo enviado pelo cliente
    url: string;           // URL não segura (http) – manter preferencialmente a secureUrl
    secureUrl: string;     // URL segura (https)
    mimetype: string;      // Mimetype informado pelo Multer
    size: number;          // Tamanho em bytes retornado pelo Cloudinary
    publicId: string;      // public_id do Cloudinary (útil para deletar/listar)
    resourceType: 'image' | 'video' | 'raw'; // Tipo de recurso no Cloudinary
}

export interface AvatarUploadResult extends UploadedFile {
    blurhash?: string;
}

/**
 * Converte Buffer em Stream para upload no Cloudinary.
 * - O Cloudinary aceita upload via stream; isso permite começar a enviar sem
 *   carregar tudo em memória de uma só vez.
 * Possíveis melhorias:
 * - Usar PassThrough stream em vez de Readable manual em alguns cenários.
 * - Validar tamanho máximo do buffer antes de começar (proteção contra payloads grandes).
 */
function bufferToStream(buffer: Buffer): Readable {
    const readable = new Readable();
    readable._read = () => {}; // _read é obrigatório mas não faz nada
    readable.push(buffer); // empurra o conteúdo do buffer
    readable.push(null);   // sinaliza fim da stream
    return readable;
}

/**
 * Determina o resource_type do Cloudinary baseado no mimetype.
 * - image/* => 'image'
 * - video/* => 'video'
 * - default  => 'raw'
 * Possíveis melhorias:
 * - Tratar audio/* como 'video' (Cloudinary costuma considerar audio como video) ou criar regra específica.
 * - Validar/whitelist de mimetypes permitidos conforme política de segurança.
 */
function getResourceType(mimetype: string): 'image' | 'video' | 'raw' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'raw';
}

/**
 * Faz upload de um arquivo para o Cloudinary.
 * Fluxo:
 * 1) Deduz o resource_type a partir do mimetype.
 * 2) Gera um public_id único combinando timestamp + nome sanitizado.
 * 3) Envia via stream para a pasta do usuário (app-lite/{userId}).
 * 4) Loga sucesso/erro e retorna metadados úteis.
 *
 * @param file - Arquivo do Multer (com buffer)
 * @param userId - ID do usuário que está fazendo upload
 * @param metadata - Metadados adicionais (categoria, descrição)
 * @returns Informações do arquivo enviado padronizadas (UploadedFile)
 *
 * Possíveis melhorias:
 * - Validar tamanho máximo (bytes) e mime antes de enviar (defesa antecipada).
 * - Usar um gerador de IDs (ex.: nanoid/uuid) em vez de timestamp para evitar colisões.
 * - Implementar retries exponenciais com jitter em caso de erros transitórios de rede.
 * - Definir limites de transformação e presets (upload presets) no Cloudinary para segurança.
 * - Configurar pasta com prefixo de ambiente (ex.: prod/ ou dev/) para evitar colisões entre ambientes.
 * - Considerar uploads assinados (signed) quando a origem for cliente, reforçando segurança.
 */
export async function uploadFile(
    file: Express.Multer.File,
    userId: string,
    metadata?: { categoria?: string; descricao?: string }
): Promise<UploadedFile> {
    try {
        const resourceType = getResourceType(file.mimetype);

        // Criar um identificador único para o arquivo
        const timestamp = Date.now();
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Upload para o Cloudinary usando stream
        const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType, // Define o tipo de recurso (image/video/raw)
                    folder: `app-lite/${userId}`, // Organizar por usuário (ex.: app-lite/123)
                    public_id: `${timestamp}_${sanitizedFilename}`, // ID público previsível
                    context: {
                        // Metadados personalizados para consulta posterior
                        userId,
                        originalName: file.originalname,
                        categoria: metadata?.categoria || '',
                        descricao: metadata?.descricao || '',
                    },
                    // Transformações automáticas para otimização de imagens
                    transformation: resourceType === 'image' ? [
                        { quality: 'auto', fetch_format: 'auto' }
                    ] : undefined,
                    // Para vídeos, usamos processamento assíncrono (eager) para evitar erros de timeout
                    // ou limites de processamento síncrono em arquivos grandes, garantindo a conversão para MP4.
                    ...(resourceType === 'video' && {
                        eager: [
                            { format: 'mp4', video_codec: 'auto', quality: 'auto' }
                        ],
                        eager_async: true
                    }),
                },
                (error, result) => {
                    // Callback do upload_stream: resolve em sucesso, reject em erro
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            // Conecta a stream do buffer ao upload do Cloudinary com tratamento de erro na stream
            const readableStream = bufferToStream(file.buffer);
            readableStream.on('error', reject);
            uploadStream.on('error', reject);
            readableStream.pipe(uploadStream);
        });

        // Log estruturado de sucesso de upload
        logger.info('cloudinary.upload.success', {
            publicId: result.public_id,
            userId,
            resourceType,
            size: result.bytes,
        });

        // Padroniza o retorno do serviço
        return {
            fileId: result.public_id, // Usar public_id como identificador
            filename: file.originalname,
            url: result.url,
            secureUrl: result.secure_url,
            mimetype: file.mimetype,
            size: result.bytes,
            publicId: result.public_id,
            resourceType,
        };
    } catch (error) {
        // Log estruturado de erro e exceção amigável para camadas superiores
        logger.error('cloudinary.upload.error', { error, userId, filename: file.originalname });
        throw new Error(`Erro ao fazer upload para Cloudinary: ${(error as Error).message}`);
    }
}

/**
 * Faz upload de múltiplos arquivos.
 * - Mapeia cada arquivo para a função de upload unitário e aguarda todos terminarem.
 * Possíveis melhorias:
 * - Limitar a concorrência (ex.: p-limit) para evitar sobrecarga da rede/API.
 * - Tratar erros parcialmente (retornar sucesso/erro por arquivo em vez de falhar tudo).
 */
export async function uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    metadata?: { categoria?: string; descricao?: string }
): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => uploadFile(file, userId, metadata));
    return Promise.all(uploadPromises);
}

/**
 * Deleta um arquivo do Cloudinary.
 * - Usa o public_id para localizar e deletar o recurso.
 *
 * @param publicId - Public ID do arquivo no Cloudinary
 * @param resourceType - Tipo do recurso (image, video, raw)
 * @returns boolean indicando sucesso (true quando 'ok')
 *
 * Possíveis melhorias:
 * - Deletar transformações/derivatives associados (quando aplicável).
 * - Usar invalidate: true para invalidar CDN (conforme plano e necessidade).
 */
export async function deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            // invalidate: true, // Possível ativar se precisar invalidar cache CDN
        });

        logger.info('cloudinary.delete.success', { publicId, result });
        return result.result === 'ok';
    } catch (error) {
        logger.error('cloudinary.delete.error', { error, publicId });
        throw new Error(`Erro ao deletar arquivo do Cloudinary: ${(error as Error).message}`);
    }
}

/**
 * Lista arquivos de um usuário no Cloudinary.
 * - Filtra por prefixo de pasta (app-lite/{userId}).
 *
 * @param userId - ID do usuário
 * @param maxResults - Número máximo de resultados (padrão: 100)
 * @returns Array de recursos (conforme retorno da API do Cloudinary)
 *
 * Possíveis melhorias:
 * - Implementar paginação via next_cursor (Cloudinary retorna cursor para continuar a listagem).
 * - Filtrar por resource_type, tags ou context (ex.: categoria) conforme necessidade.
 * - Adicionar cache ou indexação local (ex.: banco) para buscas frequentes.
 */
export async function listUserFiles(userId: string, maxResults: number = 100): Promise<any[]> {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: `app-lite/${userId}`, // pasta do usuário
            max_results: maxResults,
            context: true, // inclui metadados enviados no upload
        });

        logger.info('cloudinary.list.success', { userId, count: result.resources.length });
        return result.resources;
    } catch (error) {
        logger.error('cloudinary.list.error', { error, userId });
        throw new Error(`Erro ao listar arquivos do Cloudinary: ${(error as Error).message}`);
    }
}

/**
 * Obtém informações detalhadas de um arquivo.
 * - Útil para checar metadados, dimensões, tamanho, etc.
 *
 * @param publicId - Public ID do arquivo
 * @param resourceType - Tipo do recurso
 * @returns Objeto com informações do recurso
 *
 * Possíveis melhorias:
 * - Solicitar apenas campos necessários (se/quando a API permitir) para reduzir payload.
 * - Cachear respostas temporariamente para evitar chamadas repetidas.
 */
export async function getFileInfo(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<any> {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: resourceType,
            context: true,
        });

        logger.info('cloudinary.info.success', { publicId });
        return result;
    } catch (error) {
        logger.error('cloudinary.info.error', { error, publicId });
        throw new Error(`Erro ao obter informações do arquivo: ${(error as Error).message}`);
    }
}

/**
 * Faz upload de um avatar para o Cloudinary.
 * - O avatar é enviado para uma pasta dedicada (app-lite/{userId}/avatar).
 * - O arquivo anterior pode ser deletado automaticamente.
 *
 * @param file - Arquivo do Multer (com buffer)
 * @param userId - ID do usuário que está fazendo upload
 * @param previousPublicId - Public ID do arquivo anterior (opcional, para deletar o antigo)
 * @returns Informações do avatar enviado (AvatarUploadResult)
 *
 * Possíveis melhorias:
 * - Validar tamanho máximo (bytes) e mime antes de enviar (defesa antecipada).
 * - Usar um gerador de IDs (ex.: nanoid/uuid) em vez de timestamp para evitar colisões.
 * - Implementar retries exponenciais com jitter em caso de erros transitórios de rede.
 * - Definir limites de transformação e presets (upload presets) no Cloudinary para segurança.
 * - Configurar pasta com prefixo de ambiente (ex.: prod/ ou dev/) para evitar colisões entre ambientes.
 * - Considerar uploads assinados (signed) quando a origem for cliente, reforçando segurança.
 */
export async function uploadAvatar(
    file: Express.Multer.File,
    userId: string,
    previousPublicId?: string
): Promise<AvatarUploadResult> {
    // Upload to dedicated avatar folder
    const resourceType = 'image';
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                folder: `app-lite/${userId}/avatar`,
                public_id: `${timestamp}_${sanitizedFilename}`,
                context: {
                    userId,
                    originalName: file.originalname,
                    categoria: 'avatar'
                },
                transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        // Conecta a stream do buffer ao upload do Cloudinary com tratamento de erro na stream
        const readableStream = bufferToStream(file.buffer);
        readableStream.on('error', reject);
        uploadStream.on('error', reject);
        readableStream.pipe(uploadStream);
    });

    if (previousPublicId) {
        try {
            await deleteFile(previousPublicId, 'image');
        } catch (err) {
            logger.warn('cloudinary.avatar.delete_previous_failed', { err, previousPublicId, userId });
        }
    }

    logger.info('cloudinary.avatar.upload.success', {
        publicId: result.public_id,
        userId,
        size: result.bytes,
    });

    return {
        fileId: result.public_id,
        filename: file.originalname,
        url: result.url,
        secureUrl: result.secure_url,
        mimetype: file.mimetype,
        size: result.bytes,
        publicId: result.public_id,
        resourceType,
    };
}

// Exporta o serviço agregando as funções disponibilizadas
export const uploadService = {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    listUserFiles,
    getFileInfo,
    uploadAvatar,
};

export default uploadService;

