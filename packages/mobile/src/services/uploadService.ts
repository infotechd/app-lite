// Serviço de Upload para o app mobile
// Este módulo centraliza as operações de upload, listagem e exclusão de arquivos
// integradas ao backend (que por sua vez utiliza Cloudinary).
//
// Objetivos:
// - Oferecer funções simples para a UI enviar e gerenciar arquivos
// - Normalizar respostas do backend/Cloudinary para um formato único
// - Tratar particularidades de plataforma (ex.: Android) ao montar o FormData
//
// Ideias de melhorias futuras (TODO):
// - TODO: Implementar relatório de progresso (onUploadProgress) para mostrar barra de progresso ao usuário
// - TODO: Suportar cancelamento de upload (AbortController) para o usuário poder cancelar
// - TODO: Validar tamanho e tipo de arquivo antes do envio (limites e MIME whitelist)
// - TODO: Adicionar tentativas com backoff exponencial em falhas transitórias (rede/timeout)
// - TODO: Tornar o timeout configurável via env ou parâmetros
// - TODO: Internacionalizar mensagens de erro e padronizar codes para melhor UX
// - TODO: Melhorar tipagem das respostas do backend (evitar uso de any e caminhos alternativos)
// - TODO: Cachear listagem de arquivos e/ou usar SWR/React Query para revalidação
// - TODO: Log estruturado (com IDs de correlação) para facilitar debug em produção

import api from './api';
import type { MediaFile } from '@/utils/validation';
import { Platform } from 'react-native';

/**
 * Modelo de metadados de um arquivo armazenado na nuvem.
 * Mantém campos necessários para exibição e controle no app.
 */
export interface UploadedFileInfo {
    fileId: string; // Public ID do Cloudinary (alias/compatibilidade)
    filename: string; // Nome do arquivo (pode vir do dispositivo ou do provedor)
    url: string; // URL segura (HTTPS) para acessar o arquivo
    mimetype: string; // MIME Type (ex.: image/jpeg, video/mp4)
    size: number; // Tamanho em bytes (quando disponível)
    publicId: string; // Public ID do Cloudinary (chave principal)
    resourceType: 'image' | 'video' | 'raw'; // Tipo de recurso no Cloudinary
}

/**
 * Estrutura de retorno padronizada para uploads múltiplos.
 * - images e videos retornam apenas URLs para uso rápido
 * - raw contém a lista completa de metadados normalizados
 */
export interface UploadFilesResponse {
    images: string[]; // URLs de imagens enviadas
    videos: string[]; // URLs de vídeos enviados
    raw: UploadedFileInfo[]; // Lista completa normalizada
}

/**
 * Realiza upload dos arquivos selecionados para o backend (Cloudinary via API).
 *
 * Parâmetros:
 * - mediaFiles: lista de arquivos selecionados pelo usuário, seguindo o tipo MediaFile
 *
 * Retorno:
 * - UploadFilesResponse contendo URLs separadas por tipo e a lista completa de metadados
 *
 * Observações:
 * - Realiza normalização de URIs no Android para evitar erros do FormData
 * - Define nomes default para arquivos quando necessário
 * - Normaliza a resposta do backend para um formato consistente
 */
export async function uploadFiles(mediaFiles: MediaFile[]): Promise<UploadFilesResponse> {
    // Curto-circuito: sem arquivos, retorna estruturas vazias
    if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) {
        return { images: [], videos: [], raw: [] };
    }

    // FormData que será enviado ao endpoint /upload/files
    const form = new FormData();

    // Montagem do payload: um campo 'files' por item
    for (const f of mediaFiles) {
        let uri = f.uri;

        // Normalização de URI para Android
        // Em Android, URIs podem vir como content://, file:// ou caminhos absolutos.
        // O fetch/FormData geralmente espera file:// ou content://.
        if ((Platform as any)?.OS === 'android') {
            if (uri.startsWith('content://')) {
                // Mantém content:// como está (permitido pelo RN/Android)
            } else if (uri.startsWith('file://')) {
                // Já está OK (nada a fazer)
            } else if (uri.startsWith('/')) {
                // Caminho absoluto -> prefixa com file:// para compatibilidade
                uri = `file://${uri}`;
            } else {
                // Qualquer outro caso: força file:// como fallback seguro
                uri = `file://${uri}`;
            }
        }

        // Heurística simples para nome default baseado no tipo MIME
        const isVideo = (f.type || '').startsWith('video/');
        const defaultName = isVideo ? 'video.mp4' : 'image.jpg';

        // Objeto compatível com FormData para React Native
        const fileObject = {
            uri, // caminho/uri do arquivo no dispositivo
            type: f.type, // MIME type informado pela origem (ImagePicker, etc.)
            name: f.name || defaultName, // fallback caso não haja nome
        } as any;

        // Adiciona o arquivo no campo 'files' (o backend deve aceitar múltiplos)
        form.append('files', fileObject);
    }

    try {
        // Envia o FormData ao backend; o backend cuidará do upload no Cloudinary
        const response = await api.post('/upload/files', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 60 segundos para upload (TODO: torná-lo configurável)
            // TODO: adicionar onUploadProgress quando suportado pela stack atual
        });

        // A API pode retornar em diferentes formatos (data.data.files ou data.files)
        const data = response.data;
        const filesArr = (data?.data?.files ?? data?.files ?? []) as any[];

        // Normalizar resposta do Cloudinary/Backend para UploadedFileInfo
        const normalized: UploadedFileInfo[] = Array.isArray(filesArr)
            ? filesArr.map((it) => ({
                fileId: String(it.fileId ?? it.publicId ?? it.id ?? ''), // caminhos alternativos por compatibilidade
                filename: String(it.filename ?? it.name ?? ''), // aceita 'name' como fallback
                url: String(it.url ?? ''), // URL do arquivo (espera-se HTTPS)
                mimetype: String(it.mimetype ?? it.resourceType ?? ''), // alguns backends enviam resourceType
                size: Number(it.size ?? 0), // pode não vir, então default 0
                publicId: String(it.publicId ?? it.fileId ?? ''), // garante publicId preenchido
                resourceType: (it.resourceType ?? 'image') as 'image' | 'video' | 'raw', // default image
            }))
            : [];

        // Separar por tipo para uso mais prático na UI
        const images = normalized
            .filter((f) => f.resourceType === 'image' || f.mimetype.startsWith('image/'))
            .map((f) => f.url);

        const videos = normalized
            .filter((f) => f.resourceType === 'video' || f.mimetype.startsWith('video/'))
            .map((f) => f.url);

        // Retorna URLs categorizadas e o array completo normalizado
        return { images, videos, raw: normalized };
    } catch (error: any) {
        // Log para diagnóstico (evitar expor detalhes sensíveis ao usuário final)
        console.error('Upload error:', error);
        // Propaga erro com mensagem amigável; backend pode retornar message customizada
        throw new Error(
            error?.response?.data?.message ||
            error?.message ||
            'Erro ao fazer upload dos arquivos'
        );
    }
}

/**
 * Deleta um arquivo do Cloudinary.
 *
 * Parâmetros:
 * - publicId: identificador público do recurso no Cloudinary
 * - resourceType: tipo do recurso (image, video ou raw); default 'image'
 *
 * Retorno:
 * - boolean indicando sucesso da operação
 *
 * Observações:
 * - O publicId é codificado na URL para evitar problemas com caracteres especiais
 */
export async function deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    try {
        const response = await api.delete(`/upload/file/${encodeURIComponent(publicId)}`, {
            params: { resourceType }
        });
        // Alguns backends retornam { success: true } sob data
        return response.data?.success ?? false;
    } catch (error: any) {
        console.error('Delete error:', error);
        throw new Error(
            error?.response?.data?.message ||
            error?.message ||
            'Erro ao deletar arquivo'
        );
    }
}

/**
 * Lista arquivos do usuário autenticado.
 *
 * Retorno:
 * - Lista normalizada de UploadedFileInfo
 *
 * Observações:
 * - Normaliza a resposta, aceitando tanto data.data.files quanto data.files
 */
export async function getUserFiles(): Promise<UploadedFileInfo[]> {
    try {
        const response = await api.get('/upload/files');
        const data = response.data;
        const filesArr = (data?.data?.files ?? data?.files ?? []) as any[];

        // Mapeia para o modelo UploadedFileInfo garantindo defaults
        return Array.isArray(filesArr)
            ? filesArr.map((it) => ({
                fileId: String(it.fileId ?? it.publicId ?? ''),
                filename: String(it.filename ?? ''),
                url: String(it.url ?? ''),
                mimetype: String(it.mimetype ?? ''),
                size: Number(it.size ?? 0),
                publicId: String(it.publicId ?? it.fileId ?? ''),
                resourceType: (it.resourceType ?? 'image') as 'image' | 'video' | 'raw',
            }))
            : [];
    } catch (error: any) {
        console.error('Get files error:', error);
        throw new Error(
            error?.response?.data?.message ||
            error?.message ||
            'Erro ao listar arquivos'
        );
    }
}

// Exporta as funções do serviço para uso em outras partes do app
export default {
    uploadFiles,
    deleteFile,
    getUserFiles
};

