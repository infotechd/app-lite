import api from '@/services/api';

/**
 * Converte qualquer referência de mídia para uma URL absoluta utilizável pelo app.
 *
 * Regras de conversão:
 * - Se a entrada já for uma URL absoluta (http/https), retorna como está.
 * - Se for relativa, prefixa com a origem derivada de `api.defaults.baseURL`,
 *   removendo um sufixo "/api" caso exista (ex.: http://host:3000/api -> http://host:3000).
 * - Se a entrada vier como objeto (ex.: respostas de upload/Cloudinary), tenta
 *   extrair um campo string válido dentre `url`, `secure_url` ou `path`.
 * - Em qualquer caso inválido, retorna `undefined` para evitar falhas de renderização.
 *
 * Observação: Preferimos retornar a URL relativa original quando a base é ausente ou
 * malformada, para não quebrar a UI e permitir que componentes de imagem tratem conforme necessário.
 *
 * @param url Valor de entrada que pode ser string, objeto com campos de URL ou valores nulos/indefinidos.
 * @returns Uma URL absoluta (string) quando possível, ou `undefined` se não for possível inferir uma URL válida.
 */
export function toAbsoluteMediaUrl(url?: unknown): string | undefined {
    if (url == null) return undefined;

    // Caso a entrada seja um objeto comum de resposta de upload (ex.: Cloudinary),
    // tentamos extrair o campo mais provável que contenha a URL.
    if (typeof url !== 'string') {
        const maybe = (url as any)?.url || (url as any)?.secure_url || (url as any)?.path;
        if (typeof maybe !== 'string' || !maybe) return undefined;
        url = maybe;
    }

    const str = url as string;
    if (/^https?:\/\//i.test(str)) return str;

    const baseRaw = api?.defaults?.baseURL as string | undefined; // ex.: http://localhost:3000/api
    const base = (baseRaw || '')
        // Garante que não haja barra final primeiro
        .replace(/\/$/, '')
        // Remove sufixo "/api" caso esteja presente
        .replace(/\/?api$/i, '');

    // Se a base estiver ausente ou malformada, devolvemos a URL relativa original
    // para evitar quebra visual; componentes consumidores podem decidir como tratar.
    if (!/^https?:\/\//i.test(base)) {
        return str;
    }

    return `${base}${str.startsWith('/') ? '' : '/'}${str}`;
}

/**
 * Converte um array de referências de mídias para URLs absolutas, filtrando inválidas.
 *
 * @param urls Array contendo strings, objetos de mídia ou valores diversos.
 * @returns Lista somente com strings de URLs absolutas válidas; retorna array vazio quando a entrada não é um array.
 */
export function toAbsoluteMediaUrls(urls?: Array<unknown>): string[] {
    if (!Array.isArray(urls)) return [];
    return urls
        .map((u) => toAbsoluteMediaUrl(u))
        .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

export default { toAbsoluteMediaUrl, toAbsoluteMediaUrls };