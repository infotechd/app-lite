import api from '@/services/api';

/**
 * Normalize media URL coming from backend (which may be relative like
 * "/api/upload/file/:id") to an absolute URL usable by React Native Image/Video.
 * - If already absolute (http/https), returns as-is.
 * - If relative, prefixes with the origin derived from api.defaults.baseURL
 *   removing a trailing "/api" segment if present.
 */
export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;

    const base = String(api.defaults.baseURL || '')
        // Ensure no trailing slash first
        .replace(/\/$/, '')
        // Remove trailing /api if present
        .replace(/\/?api$/i, '');

    // If base is empty or malformed, just return the original URL to avoid breaking
    if (!base) return url;

    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Map helper for arrays.
 */
export function toAbsoluteMediaUrls(urls?: Array<string | null | undefined>): string[] {
    if (!Array.isArray(urls)) return [];
    return urls.map((u) => toAbsoluteMediaUrl(u)!).filter(Boolean) as string[];
}

export default { toAbsoluteMediaUrl, toAbsoluteMediaUrls };