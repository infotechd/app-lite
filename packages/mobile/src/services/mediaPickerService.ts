/**
 * Serviço utilitário completo para seleção e captura de mídia.
 *
 * VERSÃO FINAL CORRIGIDA - Compatível com expo-image-picker 17.0.9
 * SEM AVISOS DE DEPRECIAÇÃO
 *
 * FUNCIONALIDADES:
 * 1. Tirar foto com câmera
 * 2. Gravar vídeo com câmera (até 20 segundos)
 * 3. Escolher foto da galeria
 * 4. Escolher vídeo da galeria
 *
 * Suporte completo para Android e iOS
 */

import * as ImagePicker from 'expo-image-picker';
import { MediaFile, OFERTA_MEDIA_CONFIG, MediaConfig } from '@/utils/validation';
import { Platform } from 'react-native';
import { showAlert } from '@/utils/alert';

/**
 * Resultado padronizado das operações de seleção/captura de mídia.
 *
 * Fornece a lista final de arquivos válidos, eventuais avisos de validação
 * (tipos não suportados, tamanho excedido, duração de vídeo, etc.) e flags de
 * contexto como negação de permissão ou truncamento por limite máximo.
 */
export interface PickMediaResult {
    /** Lista de mídias válidas após processamento e mescla com o estado atual. */
    files: MediaFile[];
    /** Mensagens de aviso geradas durante a validação de cada asset selecionado. */
    warnings: string[];
    /** True se a permissão requerida (câmera/galeria) foi negada pelo usuário/SO. */
    permissionDenied?: boolean;
    /** True se o total de itens precisou ser limitado por `cfg.MAX_FILES`. */
    truncated?: boolean;
}

// Inferência de MIME type
/**
 * Obtém a extensão do arquivo a partir do nome.
 *
 * @param name Nome do arquivo (pode ser undefined)
 * @returns Extensão em minúsculas, ou string vazia quando não encontrada
 */
const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase();
/**
 * Infere o MIME type de uma mídia a partir do nome do arquivo e/ou um tipo
 * base fornecido pelo picker.
 *
 * Regras aplicadas:
 * - Se `fallbackType` indica vídeo, assume `video/mp4`.
 * - Para imagens, reconhece `png`, `jpg`, `jpeg`.
 * - Para vídeos, reconhece `mp4`.
 *
 * @param name Nome do arquivo usado para deduzir a extensão
 * @param fallbackType Tipo base informado pelo provider (ex.: 'image' | 'video')
 * @returns MIME type inferido ou `undefined` se não for possível determinar
 */
const inferMime = (name?: string, fallbackType?: string): MediaFile['type'] | undefined => {
    const ext = getExt(name);

    // Para vídeos, preservar o MIME type real no iOS (MOV será convertido no servidor)
    if (fallbackType === 'video') {
        if (Platform.OS === 'ios' && ext === 'mov') {
            return 'video/quicktime';
        }
        return 'video/mp4';
    }

    if (fallbackType === 'image') {
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        if (Platform.OS === 'ios' && ext === 'heic') return 'image/heic';
    }

    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'mov' && Platform.OS === 'ios') return 'video/quicktime';

    return undefined;
};

/**
 * Processa os assets retornados pelo `expo-image-picker`, aplicando as regras
 * de validação e negócio definidas na `cfg` e no `mediaType` solicitado.
 *
 * Fluxo de validação por asset:
 * - Checa tipo/MIME permitido (incluindo restrição a MP4 quando vídeo);
 * - Checa coerência com o filtro solicitado (somente imagem, somente vídeo);
 * - Valida duração máxima de vídeo (em segundos);
 * - Valida tamanho máximo do arquivo (bytes);
 * - Cria `MediaFile` e mescla com a lista atual, evitando duplicidade por `uri`.
 *
 * Ao final, respeita o limite `cfg.MAX_FILES`, sinalizando `truncated` se
 * houver excesso.
 *
 * @param assets Lista de itens brutos retornados pelo picker (imagens/vídeos)
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação de mídia (tipos, tamanhos, limites)
 * @param mediaType Filtro de mídia aplicado nesta operação: 'image' | 'video' | 'all'
 * @returns Objeto `PickMediaResult` com a lista final e avisos de validação
 */
function processAssets(
    assets: any[],
    current: MediaFile[],
    cfg: MediaConfig,
    mediaType: 'image' | 'video' | 'all'
): PickMediaResult {
    const accepted: MediaFile[] = [];
    const warnings: string[] = [];

    // Percorre cada asset bruto para validar e normalizar em `MediaFile`
    for (const [idx, asset] of assets.entries()) {
        const nameGuess = (asset as any).fileName
            || asset.uri.split('/').pop()
            || `media-${Date.now()}-${idx}`;
        const mime = (asset as any).mimeType || inferMime(nameGuess, (asset as any).type);
        const size = (asset as any).fileSize as number | undefined;
        const rawDuration = (asset as any).duration as number | undefined;
        // Normaliza duração para segundos: alguns providers (Android) retornam em ms
        const durationSec = typeof rawDuration === 'number'
            ? (rawDuration > 1000 ? rawDuration / 1000 : rawDuration)
            : undefined;

        // Validar tipo/MIME suportado
        if (!mime || !cfg.ALLOWED_TYPES.includes(mime)) {
            warnings.push(`${nameGuess}: tipo não suportado`);
            continue;
        }

        // Se estamos buscando apenas imagens, rejeitar vídeos
        if (mediaType === 'image' && mime.startsWith('video/')) {
            warnings.push(`${nameGuess}: apenas imagens são permitidas nesta seleção`);
            continue;
        }

        // Se estamos buscando apenas vídeos, rejeitar imagens
        if (mediaType === 'video' && mime.startsWith('image/')) {
            warnings.push(`${nameGuess}: apenas vídeos são permitidos nesta seleção`);
            continue;
        }

        // Vídeos: aceitar MP4 sempre, e MOV apenas no iOS (será convertido no servidor)
        if (mime.startsWith('video/')) {
            const isAllowedVideo = mime === 'video/mp4' ||
                (Platform.OS === 'ios' && mime === 'video/quicktime');

            if (!isAllowedVideo) {
                warnings.push(`${nameGuess}: formato de vídeo não suportado. Use MP4${Platform.OS === 'ios' ? ' ou MOV' : ''}.`);
                continue;
            }
        }

        // Validar duração de vídeo (em segundos) com pequena tolerância para metadados
        if (mime.startsWith('video/') && typeof durationSec === 'number') {
            const allowed = cfg.MAX_VIDEO_DURATION + 0.5; // tolerância de 0.5s
            if (durationSec > allowed) {
                warnings.push(`${nameGuess}: vídeo excede ${cfg.MAX_VIDEO_DURATION} segundos`);
                continue;
            }
        }

        // Validar tamanho do arquivo (bytes)
        if (typeof size === 'number' && size > cfg.MAX_SIZE) {
            warnings.push(`${nameGuess}: excede ${cfg.MAX_SIZE / 1024 / 1024}MB`);
            continue;
        }

        // Normaliza asset em `MediaFile` compatível com upload
        const file: MediaFile = {
            uri: asset.uri,
            name: nameGuess,
            type: mime,
            size,
        };
        accepted.push(file);
    }

    // Mescla com arquivos existentes, mantendo ordem e removendo duplicidade por URI
    const merged = [...current];
    for (const f of accepted) {
        if (!merged.some((m) => m.uri === f.uri)) merged.push(f);
    }

    // Aplica o limite máximo de arquivos permitido
    const truncated = merged.length > cfg.MAX_FILES;
    const files = merged.slice(0, cfg.MAX_FILES);

    return { files, warnings, truncated };
}

/**
 * 1. TIRAR FOTO COM CÂMERA
 *
 * Solicita permissão de câmera, abre o fluxo de captura de foto e processa o
 * resultado. Respeita o limite de quantidade, valida tipos e tamanhos conforme
 * `cfg` e retorna avisos quando aplicável.
 *
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação e limites de mídia
 * @returns `PickMediaResult` com a lista final, avisos e flags de contexto
 */
export async function takePhoto(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') {
        showAlert(
            'Permissão Negada',
            'É necessário permitir o acesso à câmera para tirar fotos.'
        );
        return { files: current, warnings: [], permissionDenied: true };
    }

    try {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (result.canceled) {
            return { files: current, warnings: [] };
        }

        return processAssets(result.assets, current, cfg, 'image');
    } catch (error) {
        console.error('Erro ao tirar foto:', error);
        showAlert('Erro', 'Não foi possível tirar a foto.');
        return { files: current, warnings: [] };
    }
}

/**
 * 2. GRAVAR VÍDEO COM CÂMERA
 *
 * Solicita permissão de câmera, inicia a captura de vídeo respeitando a
 * duração máxima definida em `cfg.MAX_VIDEO_DURATION` e processa o resultado.
 * Aceita apenas vídeos MP4.
 *
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação e limites de mídia
 * @returns `PickMediaResult` com a lista final, avisos e flags de contexto
 */
export async function recordVideo(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') {
        showAlert(
            'Permissão Negada',
            'É necessário permitir o acesso à câmera para gravar vídeos.'
        );
        return { files: current, warnings: [], permissionDenied: true };
    }

    try {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 1,
            videoMaxDuration: cfg.MAX_VIDEO_DURATION,
        });

        if (result.canceled) {
            return { files: current, warnings: [] };
        }

        return processAssets(result.assets, current, cfg, 'video');
    } catch (error) {
        console.error('Erro ao gravar vídeo:', error);
        showAlert('Erro', 'Não foi possível gravar o vídeo.');
        return { files: current, warnings: [] };
    }
}

/**
 * 3. ESCOLHER FOTO DA GALERIA
 *
 * Solicita permissão de acesso à biblioteca de mídia e abre o seletor para
 * imagens, permitindo múltipla seleção até o limite restante. Aplica validações
 * de tipo e tamanho e retorna avisos, quando houver.
 *
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação e limites de mídia
 * @returns `PickMediaResult` com a lista final, avisos e flags de contexto
 */
export async function pickPhoto(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
        showAlert(
            'Permissão Negada',
            'É necessário permitir o acesso à galeria para escolher fotos.'
        );
        return { files: current, warnings: [], permissionDenied: true };
    }

    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
        });

        if (result.canceled) {
            return { files: current, warnings: [] };
        }

        return processAssets(result.assets, current, cfg, 'image');
    } catch (error) {
        console.error('Erro ao escolher foto:', error);
        showAlert('Erro', 'Não foi possível escolher a foto.');
        return { files: current, warnings: [] };
    }
}

/**
 * 4. ESCOLHER VÍDEO DA GALERIA
 *
 * Solicita permissão de acesso à biblioteca de mídia e abre o seletor para
 * vídeos, permitindo múltipla seleção até o limite restante. Apenas vídeos
 * MP4 são aceitos. Aplica validações de duração e tamanho.
 *
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação e limites de mídia
 * @returns `PickMediaResult` com a lista final, avisos e flags de contexto
 */
export async function pickVideo(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
        showAlert(
            'Permissão Negada',
            'É necessário permitir o acesso à galeria para escolher vídeos.'
        );
        return { files: current, warnings: [], permissionDenied: true };
    }

    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
        });

        if (result.canceled) {
            return { files: current, warnings: [] };
        }

        return processAssets(result.assets, current, cfg, 'video');
    } catch (error) {
        console.error('Erro ao escolher vídeo:', error);
        showAlert('Erro', 'Não foi possível escolher o vídeo.');
        return { files: current, warnings: [] };
    }
}

/**
 * FUNÇÃO LEGADA: Escolher qualquer mídia (mantida para compatibilidade)
 *
 * Seleciona imagens e/ou vídeos da galeria respeitando o limite restante.
 * Útil para fluxos antigos que não distinguem entre foto e vídeo.
 *
 * Observação: regras de validação de tipo, tamanho e duração continuam
 * aplicadas dentro de `processAssets`.
 *
 * @param current Lista atual de mídias já selecionadas
 * @param cfg Configuração de validação e limites de mídia
 * @returns `PickMediaResult` com a lista final, avisos e flags de contexto
 */
export async function pickMedia(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
        return { files: current, warnings: [], permissionDenied: true };
    }

    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
    });

    if (result.canceled) return { files: current, warnings: [] };

    return processAssets(result.assets, current, cfg, 'all');
}
