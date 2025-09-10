// Utilitários para chamadas de API no app mobile
// Implementa unwrapApiResponse padronizado e robusto

import type { ApiResponse } from "@/types/api";

export interface UnwrapOptions<T> {
    defaultValue?: T;
    strict?: boolean; // quando true, lança erro se success === false
}

/**
 * Desembrulha uma resposta que pode estar no formato ApiResponse<T>
 * ou já ser o dado cru de T. Oferece opções para valor padrão e modo estrito.
 */
export function unwrapApiResponse<T>(raw: unknown, options?: UnwrapOptions<T>): T {
    const { defaultValue, strict } = options ?? {};

    if (raw && typeof raw === "object") {
        const obj = raw as any;
        const looksLikeEnvelope = "success" in obj && ("data" in obj || "message" in obj || "error" in obj);
        if (looksLikeEnvelope) {
            const api = obj as ApiResponse<T>;
            if (api.success) {
                if (api.data !== undefined) return api.data as T;
                return (defaultValue as T) ?? ({} as T);
            }
            // success === false
            const msg = api.error || api.message || "Erro desconhecido da API";
            if (strict) {
                throw new Error(msg);
            }
            // modo não estrito: devolve defaultValue (ou objeto vazio)
            return (defaultValue as T) ?? ({} as T);
        }
    }

    // Se não for envelope conhecido, retorna como está
    return raw as T;
}
