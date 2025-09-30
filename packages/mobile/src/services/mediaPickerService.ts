/**
 * Serviço utilitário para seleção de mídia (imagens e vídeos) usando expo-image-picker.
 *
 * Objetivo:
 * - Solicitar permissão de acesso à galeria do dispositivo.
 * - Abrir o seletor de mídia permitindo múltipla seleção (quando suportado) de imagens e vídeos.
 * - Validar arquivos selecionados contra regras de negócios (tipos permitidos, tamanho e duração).
 * - Mesclar com a lista atual, removendo duplicidades e respeitando o limite máximo permitido.
 * - Retornar avisos (warnings) para qualquer item não aceito e sinalizadores úteis (permissão negada, truncamento).
 *
 * Observações:
 * - Este arquivo adiciona apenas comentários e sugestões de melhoria (PT-BR) sem alterar a lógica existente.
 * - Em ambientes com diferentes versões do expo-image-picker, alguns enums/nome de opções mudam; há um fallback tratado abaixo.
 */

import * as ImagePicker from 'expo-image-picker';
import { MediaFile, OFERTA_MEDIA_CONFIG, MediaConfig } from '@/utils/validation';

/**
 * Resultado padronizado da seleção de mídia.
 *
 * files: lista final de arquivos aceitos (após validações e deduplicação).
 * warnings: mensagens para o usuário indicando por que itens foram rejeitados.
 * permissionDenied: true quando o usuário nega a permissão de acesso à galeria.
 * truncated: true quando houve corte por atingir o limite máximo permitido.
 */
export interface PickMediaResult {
    files: MediaFile[];
    warnings: string[];
    permissionDenied?: boolean;
    truncated?: boolean;
}

// Inferência simples de MIME com base na extensão e/ou no tipo do asset fornecido pelo picker
// Obs.: isso é um heuristic (melhor tentativa). Em alguns dispositivos a extensão pode não refletir o MIME real.
// Sugestão futura: usar libs que leem cabeçalho (magic numbers) para inferir o tipo real, quando possível.
const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase();
const inferMime = (name?: string, fallbackType?: string): MediaFile['type'] | undefined => {
    const ext = getExt(name);

    // Se o picker diz que é vídeo/imagem, tentamos retornar um MIME plausível.
    // ATENÇÃO: assumir "video/mp4" para qualquer vídeo é uma simplificação para a regra de negócio atual
    // (apenas MP4 é aceito). Outros formatos de vídeo não serão aceitos adiante.
    if (fallbackType === 'video') return 'video/mp4';
    if (fallbackType === 'image') {
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    }

    // Caso não haja fallback type, tentamos pela extensão.
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'mp4') return 'video/mp4';

    // TODO: considerar suporte a HEIC/HEIF (muito comum em iOS). Poderíamos converter para JPEG no upload.
    return undefined;
};

/**
 * Abre o seletor de mídia do sistema e retorna os arquivos aceitos conforme as regras de cfg.
 *
 * Parâmetros:
 * - current: lista de mídias já selecionadas/atribuídas.
 * - cfg: regras de validação (número máximo, tipos e tamanho máximo). Padrão: OFERTA_MEDIA_CONFIG.
 *
 * Regras implementadas:
 * - Tipos permitidos: definidos em cfg.ALLOWED_TYPES (ex.: image/jpeg, image/png, video/mp4).
 * - Vídeos somente em MP4 e com duração máxima de 15s.
 * - Tamanho máximo (bytes) definido em cfg.MAX_SIZE.
 * - Máximo de arquivos total definido em cfg.MAX_FILES (incluindo os já existentes em current).
 *
 * Observações de plataforma:
 * - allowsMultipleSelection e selectionLimit podem variar por plataforma/versão do SO.
 * - duration é geralmente em segundos segundo docs do Expo, mas já houve variações; ver comentário no check.
 *
 * Retorno: PickMediaResult com arquivos aceitos, avisos e flags.
 */
export async function pickMedia(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    // 1) Solicitar permissão para acessar a galeria (obrigatório no iOS; no Android depende da versão)
    // Dica: é possível diferenciar "negada temporariamente" de "negada permanentemente" e guiar o usuário às configurações.
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
        // Sem permissão: não altera a lista atual, sinaliza permissionDenied para a UI lidar.
        return { files: current, warnings: [], permissionDenied: true };
    }

    // 2) Calcular quantos itens ainda podem ser adicionados para respeitar o limite máximo.
    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        // Nada a selecionar: já atingiu o limite; sinaliza truncado para a UI avisar, se desejar.
        return { files: current, warnings: [], truncated: true };
    }

    // 3) Abrir seletor de mídia (imagens e vídeos) com compatibilidade entre versões do expo-image-picker
    // Em versões mais novas, existe ImagePicker.MediaType; em outras, MediaTypeOptions.
    const mediaTypesOpt = (ImagePicker as any).MediaType
        ? [(ImagePicker as any).MediaType.Images, (ImagePicker as any).MediaType.Videos]
        : (ImagePicker as any).MediaTypeOptions.All;

    // Configuração do seletor:
    // - allowsMultipleSelection: tenta permitir múltipla seleção quando suportado.
    // - selectionLimit: limita quantos itens o usuário pode escolher nesta sessão (respeita o remaining).
    // - quality: 1 (máxima) — afeta principalmente JPEG gerado. PNG ignora quality; vídeos ignoram aqui.
    // Sugestão futura: permitir reduzir quality/redimensionar imagens para otimizar upload e uso de dados.
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOpt,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
    } as any);

    // Usuário cancelou o seletor: não altera nada.
    if (result.canceled) return { files: current, warnings: [] };

    // Listas acumuladoras: aceitos e avisos de rejeições.
    const accepted: MediaFile[] = [];
    const warnings: string[] = [];

    // 4) Processar cada asset retornado pelo seletor
    for (const [idx, asset] of result.assets.entries()) {
        // Tentar determinar um nome amigável para o arquivo
        // - fileName nem sempre vem preenchido (especialmente em Android). Fallback: último segmento da URI.
        // - Se nada funcionar, gerar um nome único baseado no timestamp e índice.
        const nameGuess = (asset as any).fileName || asset.uri.split('/').pop() || `media-${Date.now()}-${idx}`;

        // Detectar MIME: usar o mimeType retornado, senão tentar inferir por nome e tipo do asset.
        const mime = (asset as any).mimeType || inferMime(nameGuess, (asset as any).type);

        // Metadados auxiliares (podem não existir em todas as plataformas)
        const size = (asset as any).fileSize as number | undefined; // bytes
        const duration = (asset as any).duration as number | undefined; // segundos (em geral)

        // 4.1) Validar tipo/MIME contra a configuração
        if (!mime || !cfg.ALLOWED_TYPES.includes(mime)) {
            // TODO: internacionalizar (i18n) estas mensagens para suportar múltiplos idiomas.
            warnings.push(`${nameGuess}: tipo não suportado. Use imagens JPG/PNG ou vídeo MP4`);
            continue;
        }

        // 4.2) Reforçar que somente MP4 é aceito para vídeos
        if ((asset as any).type === 'video' && mime !== 'video/mp4') {
            warnings.push(`${nameGuess}: apenas vídeos MP4 são permitidos`);
            continue;
        }

        // 4.3) Restringir duração do vídeo a 15 segundos
        // OBSERVAÇÃO: Expo documenta duração em segundos, mas já houve relatos de plataformas retornando em ms.
        // Sugestão futura: normalizar/validar com margem ou checar valores atípicos (ex.: duration > 1000 = ms).
        if ((asset as any).type === 'video' && typeof duration === 'number' && duration > 15) {
            warnings.push(`${nameGuess}: vídeo excede 15 segundos`);
            continue;
        }

        // 4.4) Restringir tamanho máximo por arquivo (ex.: 10MB), vindo de cfg.MAX_SIZE
        if (typeof size === 'number' && size > cfg.MAX_SIZE) {
            // Sugestão futura: oferecer compressão/redimensionamento automático quando exceder o limite.
            warnings.push(`${nameGuess}: excede 10MB`);
            continue;
        }

        // 4.5) Montar objeto no formato esperado pela API de upload/consumo interno
        const file: MediaFile = {
            uri: asset.uri,
            name: nameGuess,
            type: mime,
            size,
        };
        accepted.push(file);
    }

    // 5) Mesclar com os arquivos já existentes, evitando duplicidades pela URI
    // Nota: duas URIs diferentes podem apontar para o mesmo conteúdo. Futuro: deduplicar por hash do conteúdo.
    const merged = [...current];
    for (const f of accepted) {
        if (!merged.some((m) => m.uri === f.uri)) merged.push(f);
    }

    // 6) Respeitar o limite máximo de arquivos e sinalizar se houve truncamento
    const truncated = merged.length > cfg.MAX_FILES;
    const files = merged.slice(0, cfg.MAX_FILES);

    // 7) Retornar resultado consolidado para a UI consumir
    return { files, warnings, truncated };
}
