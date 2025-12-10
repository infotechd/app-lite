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
    publicId?: string; // Public ID do Cloudinary (opcional)
    resourceType?: 'image' | 'video' | 'raw'; // Tipo de recurso no Cloudinary (opcional)
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
 * Realiza o upload de um ou mais arquivos para o backend, que por sua vez envia para o Cloudinary.
 *
 * O método cuida de detalhes de plataforma (como normalização de URIs no Android),
 * prepara um FormData com os arquivos e devolve uma resposta normalizada
 * contendo URLs úteis para exibição na UI e metadados completos de cada item.
 *
 * @param mediaFiles Lista de arquivos selecionados pelo usuário (MediaFile[]). Cada item deve conter:
 * - uri: string (obrigatório). Pode ser content://, file:// ou caminho absoluto; em Android será normalizado.
 * - type: string (recomendado). MIME type, ex.: image/jpeg, video/mp4.
 * - name?: string (opcional). Caso ausente, um nome padrão é inferido pelo tipo (image.jpg ou video.mp4).
 * @returns Promise com objeto contendo:
 * - images: string[] com URLs de imagens
 * - videos: string[] com URLs de vídeos
 * - raw: UploadedFileInfo[] com metadados completos normalizados
 * @throws Error Quando a requisição falha (timeout, rede ou erro retornado pelo backend). A mensagem
 *         tenta preservar a mensagem amigável vinda da API quando disponível.
 * @remarks
 * - Timeout padrão de 60s (pode ser ajustado futuramente).
 * - O backend pode responder em formatos distintos (data.data.files ou data.files); ambos são aceitos.
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
                fileId: String(it.fileId ?? it.publicId ?? it.id ?? ''),
                filename: String(it.filename ?? it.name ?? ''),
                url: String(it.url ?? ''),
                mimetype: String(it.mimetype ?? ''),
                size: Number(it.size ?? 0),
            }))
            : [];

        // Separar por tipo para uso mais prático na UI
        const images = normalized
            .filter((f) => typeof f.mimetype === 'string' && f.mimetype.startsWith('image/'))
            .map((f) => f.url);

        const videos = normalized
            .filter((f) => typeof f.mimetype === 'string' && f.mimetype.startsWith('video/'))
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
 * Deleta um arquivo previamente enviado ao Cloudinary via backend.
 *
 * @param publicId Identificador público do recurso no Cloudinary (ex.: "folder/nome_arquivo").
 * @param resourceType Tipo do recurso a ser deletado: 'image', 'video' ou 'raw'. Padrão: 'image'.
 * @returns Promise que resolve para true quando o backend confirma a exclusão, ou false caso contrário.
 * @throws Error Quando a operação falha; a mensagem tenta preservar informações amigáveis vindas da API.
 * @remarks O publicId é codificado na URL para evitar problemas com caracteres especiais.
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
 * Lista os arquivos do usuário autenticado a partir do backend.
 *
 * @returns Promise com uma lista normalizada (UploadedFileInfo[]) contendo metadados essenciais
 *          como fileId, filename, url, mimetype e size.
 * @throws Error Quando a listagem falha; a mensagem tenta preservar informações amigáveis da API.
 * @remarks A função aceita diferentes formatos de resposta do backend (data.data.files ou data.files).
 */
export async function getUserFiles(): Promise<UploadedFileInfo[]> {
    try {
        const response = await api.get('upload/files');
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

