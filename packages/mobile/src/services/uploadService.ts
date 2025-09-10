import api from './api';
import type { MediaFile } from '@/utils/validation';
import { Platform } from 'react-native';

export interface UploadedFileInfo {
    fileId: string;
    filename: string;
    url: string; // e.g. /api/upload/file/:id
    mimetype: string;
    size: number;
}

export interface UploadFilesResponse {
    images: string[]; // URLs of images
    videos: string[]; // URLs of videos
    raw: UploadedFileInfo[]; // full info from server
}

// Upload selected media files to the backend GridFS endpoint
// The backend expects field name "files" and returns { success, data: { files: [...] } }
export async function uploadFiles(mediaFiles: MediaFile[]): Promise<UploadFilesResponse> {
    if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) {
        return { images: [], videos: [], raw: [] };
    }

    const form = new FormData();
    for (const f of mediaFiles) {
        // Axios on React Native accepts { uri, name, type }
        // Ensure uri has file:// prefix on Android if missing
        const uri = Platform.OS === 'android' && !f.uri.startsWith('file://') ? `file://${f.uri}` : f.uri;
        form.append('files', { uri, name: f.name, type: f.type } as any);
    }

    const response = await api.post('/upload/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxBodyLength: Infinity,
    });

    const data = response?.data;
    const filesArr = (data?.data?.files ?? data?.files ?? []) as any[];

    const normalized: UploadedFileInfo[] = Array.isArray(filesArr)
        ? filesArr.map((it) => ({
            fileId: String(it.fileId ?? it.id ?? ''),
            filename: String(it.filename ?? it.name ?? ''),
            url: String(it.url ?? ''),
            mimetype: String(it.mimetype ?? ''),
            size: Number(it.size ?? 0),
        }))
        : [];

    const images = normalized
        .filter((f) => f.mimetype.startsWith('image/'))
        .map((f) => f.url);
    const videos = normalized
        .filter((f) => f.mimetype.startsWith('video/'))
        .map((f) => f.url);

    return { images, videos, raw: normalized };
}

export default { uploadFiles };
