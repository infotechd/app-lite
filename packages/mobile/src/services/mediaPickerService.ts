import * as ImagePicker from 'expo-image-picker';
import { MediaFile, OFERTA_MEDIA_CONFIG, MediaConfig } from '@/utils/validation';

export interface PickMediaResult {
    files: MediaFile[];
    warnings: string[];
    permissionDenied?: boolean;
    truncated?: boolean;
}

// Inferência simples de MIME com base na extensão e no tipo do asset
const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase();
const inferMime = (name?: string, fallbackType?: string): MediaFile['type'] | undefined => {
    const ext = getExt(name);
    if (fallbackType === 'video') return 'video/mp4';
    if (fallbackType === 'image') {
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    }
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'mp4') return 'video/mp4';
    return undefined;
};

export async function pickMedia(
    current: MediaFile[],
    cfg: MediaConfig = OFERTA_MEDIA_CONFIG
): Promise<PickMediaResult> {
    // 1) Permissão
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
        return { files: current, warnings: [], permissionDenied: true };
    }

    const remaining = cfg.MAX_FILES - current.length;
    if (remaining <= 0) {
        return { files: current, warnings: [], truncated: true };
    }

    // 2) Abrir seletor de mídia (imagens e vídeos) com compatibilidade de enums
    const mediaTypesOpt = (ImagePicker as any).MediaType
        ? [(ImagePicker as any).MediaType.Images, (ImagePicker as any).MediaType.Videos]
        : (ImagePicker as any).MediaTypeOptions.All;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOpt,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
    } as any);

    if (result.canceled) return { files: current, warnings: [] };

    const accepted: MediaFile[] = [];
    const warnings: string[] = [];

    for (const [idx, asset] of result.assets.entries()) {
        const nameGuess = (asset as any).fileName || asset.uri.split('/').pop() || `media-${Date.now()}-${idx}`;
        const mime = (asset as any).mimeType || inferMime(nameGuess, (asset as any).type);
        const size = (asset as any).fileSize as number | undefined;
        const duration = (asset as any).duration as number | undefined;

        if (!mime || !cfg.ALLOWED_TYPES.includes(mime)) {
            warnings.push(`${nameGuess}: tipo não suportado. Use imagens JPG/PNG ou vídeo MP4`);
            continue;
        }

        if ((asset as any).type === 'video' && mime !== 'video/mp4') {
            warnings.push(`${nameGuess}: apenas vídeos MP4 são permitidos`);
            continue;
        }

        if ((asset as any).type === 'video' && typeof duration === 'number' && duration > 15) {
            warnings.push(`${nameGuess}: vídeo excede 15 segundos`);
            continue;
        }

        if (typeof size === 'number' && size > cfg.MAX_SIZE) {
            warnings.push(`${nameGuess}: excede 10MB`);
            continue;
        }

        const file: MediaFile = {
            uri: asset.uri,
            name: nameGuess,
            type: mime,
            size,
        };
        accepted.push(file);
    }

    // Deduplicar por uri
    const merged = [...current];
    for (const f of accepted) {
        if (!merged.some((m) => m.uri === f.uri)) merged.push(f);
    }

    const truncated = merged.length > cfg.MAX_FILES;
    const files = merged.slice(0, cfg.MAX_FILES);

    return { files, warnings, truncated };
}
