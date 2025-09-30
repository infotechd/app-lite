// Serviço de Upload de Arquivos (Mobile)
// Este módulo encapsula a lógica de montar um FormData com arquivos locais
// (imagens e vídeos) e enviá‑los para o backend. Os comentários abaixo explicam
// cada parte do código e apontam melhorias futuras onde aplicável.

import api from './api'; // Instância HTTP (Axios) configurada para o app
import type { MediaFile } from '@/utils/validation'; // Tipo de arquivo de mídia selecionado no app
import { Platform } from 'react-native'; // Usado para tratar diferenças entre Android e iOS

// Interface com as informações normalizadas que o backend retorna para cada arquivo
export interface UploadedFileInfo {
    fileId: string; // ID do arquivo no backend (ex.: GridFS ID)
    filename: string; // Nome do arquivo armazenado
    url: string; // URL relativa para acessar o arquivo (ex.: /api/upload/file/:id)
    mimetype: string; // Tipo MIME (ex.: image/jpeg, video/mp4)
    size: number; // Tamanho em bytes
}

// Estrutura do retorno principal da função de upload
export interface UploadFilesResponse {
    images: string[]; // URLs apenas de imagens (filtradas pelo mimetype)
    videos: string[]; // URLs apenas de vídeos (filtradas pelo mimetype)
    raw: UploadedFileInfo[]; // Lista completa de arquivos com metadados normalizados
}

// Realiza upload dos arquivos selecionados para o endpoint do backend (GridFS)
// O backend espera o campo multipart com o nome "files"
// e responde no formato { success, data: { files: [...] } } (ou variações compatíveis)
export async function uploadFiles(mediaFiles: MediaFile[]): Promise<UploadFilesResponse> {
    // Guarda de segurança: se não houver arquivos, retorna estruturas vazias
    if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) {
        return { images: [], videos: [], raw: [] };
    }

    // Cria a instância de FormData que será enviada no corpo da requisição
    const form = new FormData();
    
    // Itera sobre cada arquivo selecionado pelo usuário
    for (const f of mediaFiles) {
        // Ajuste de URI para React Native (especialmente no Android)
        // Em Android, podemos encontrar formatos diferentes:
        //  - content:// -> mantemos como está (pode exigir tratamento especial no backend ou libs específicas)
        //  - file:// -> já é um caminho de arquivo válido
        //  - caminhos absolutos ("/") sem prefixo -> prefixamos com file://
        //  - alguns pickers retornam sem prefixo -> também prefixamos com file://
        // Observação: no iOS geralmente vêm como file://
        let uri = f.uri;
        if (Platform.OS === 'android') {
            if (uri.startsWith('content://')) {
                // mantém content:// como está
                // TODO: (Melhoria) considerar suporte robusto a content:// usando bibliotecas como
                //       react-native-blob-util ou soluções equivalentes, caso o backend não aceite
                //       diretamente esse esquema. Também avaliar conversão para file:// quando necessário.
            } else if (uri.startsWith('file://')) {
                // já OK para multipart
            } else if (uri.startsWith('/')) {
                // path absoluto: garantir o prefixo file:// para o FormData
                uri = `file://${uri}`;
            } else {
                // alguns pickers retornam sem prefixo: garantir file://
                uri = `file://${uri}`;
            }
        }
        // TODO: (Melhoria) Considerar normalização também específica para iOS, se necessário,
        //       e validar se o caminho existe/é acessível antes de enviar.

        // Inferimos se é vídeo pelo MIME type para definir um nome padrão adequado
        const isVideo = (f.type || '').startsWith('video/');
        const defaultName = isVideo ? 'video.mp4' : 'image.jpg';

        // Objeto de arquivo no formato esperado pelo FormData do React Native
        const fileObject = {
            uri,                 // caminho/URI do arquivo local
            type: f.type,        // MIME type
            name: f.name || defaultName, // nome do arquivo (fallback caso não venha do picker)
        } as any; // as any: compatibilidade com implementações RN/axios
        // TODO: (Melhoria) Remover "as any" criando um tipo mais estrito para o arquivo
        //       (ex.: { uri: string; type: string; name: string }) e garantindo compatibilidade.

        // CRÍTICO: o backend espera exatamente o campo 'files' no multipart
        form.append('files', fileObject);
    }

    // Envia como multipart/form-data
    // OBS: Definir manualmente 'Content-Type' força o Axios a usar esse valor; em alguns casos
    // é preferível deixar o Axios preencher (com boundary) automaticamente.
    // TODO: (Melhoria) Avaliar remover o header explícito e deixar Axios definir o boundary:
    //       api.post(url, form) sem headers, caso não haja middleware exigindo manualmente.
    const response = await api.post('/upload/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // TODO: (Melhoria) Considerar adicionar timeout, onUploadProgress e sinal de cancelamento
        //       (AbortController) para melhor UX e robustez.
    });

    // Em Axios, a resposta já vem serializada em response.data
    const data = response.data;

    // O backend pode responder em data.data.files ou data.files; suportamos ambas as variações
    const filesArr = (data?.data?.files ?? data?.files ?? []) as any[];
    // TODO: (Melhoria) Tipar melhor a resposta do backend (criar uma interface de resposta
    //       específica) e padronizar o contrato no servidor para evitar checagens alternativas.

    // Normaliza cada item para UploadedFileInfo, fornecendo defaults seguros
    const normalized: UploadedFileInfo[] = Array.isArray(filesArr)
        ? filesArr.map((it) => ({
            fileId: String(it.fileId ?? it.id ?? ''),
            filename: String(it.filename ?? it.name ?? ''),
            url: String(it.url ?? ''),
            mimetype: String(it.mimetype ?? ''),
            size: Number(it.size ?? 0),
        }))
        : [];

    // Separa URLs de imagens e vídeos com base no mimetype
    const images = normalized
        .filter((f) => f.mimetype.startsWith('image/'))
        .map((f) => f.url);

    const videos = normalized
        .filter((f) => f.mimetype.startsWith('video/'))
        .map((f) => f.url);

    // Retorna os arrays filtrados e a lista completa normalizada
    return { images, videos, raw: normalized };

    // TODO: (Melhoria) Adicionar try/catch envolvendo toda a operação para capturar e
    //       traduzir erros (rede, validação, resposta inesperada), retornando um formato
    //       consistente ou lançando erros com mensagens amigáveis.
    // TODO: (Melhoria) Validar tamanho/tipo antes do envio (ex.: bloquear > X MB ou tipos não suportados)
    // TODO: (Melhoria) Implementar retry com backoff exponencial para falhas transitórias de rede
}

// Export default para facilitar import em outras partes do app
export default { uploadFiles };
