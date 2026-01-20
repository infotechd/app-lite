// Serviço HTTP (Axios) central do app mobile.
// - Define baseURL dinâmica em desenvolvimento (autodetecção dos IPs locais)
// - Configura headers e timeouts padrão
// - Gerencia token JWT em memória e via AsyncStorage
// - Intercepta requests/responses para anexar token e tratar erros comuns
// - Fornece utilitários para sobrepor a baseURL manualmente em debug

import axios from 'axios';
import { captureException } from '@/utils/sentry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================================================

// URL de produção - SEMPRE usar esta em builds de preview/production
const PRODUCTION_API_URL = 'https://api.app-super.digital/api/';

// Verifica se estamos em modo de desenvolvimento
// __DEV__ é definido pelo Metro bundler e é false em builds de produção/preview
const IS_DEVELOPMENT = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/**
 * Autodetecção de IPs do backend em desenvolvimento.
 * - Casa: 192.168.15.12 (exemplo)
 * - Trabalho: 192.168.1.12 (exemplo)
 * - Emulador Android: 10.0.2.2 (IP especial que aponta para o host)
 * - iOS Simulator: 127.0.0.1
 *
 * Em produção, a URL deve permanecer fixa (domínio público do backend).
 */
const DEV_CANDIDATE_URLS: string[] = [
    'http://192.168.1.54:4000/api', // Rede Mercúrio
    'http://192.168.1.12:4000/api',  // Trabalho — IP do seu trabalho
    'http://192.168.1.8:4000/api',   // Ip do Trabalho
    'http://192.168.1.4:4000/api',   // Trabalho - Márcio
    'http://192.168.1.3:4000/api',   // IP adicional solicitado
    'http://192.168.15.12:4000/api', // Casa — faixa alternativa 192.168.15.x
    'http://192.168.15.1:4000/api',  // Casa — gateway/roteador comum
    'http://10.0.2.2:4000/api',      // Emulador Android (host do PC)
    'http://127.0.0.1:4000/api',     // iOS Simulator (host local)
    'http://localhost:4000/api'
];

// Endpoint leve já existente no backend para checagem de saúde (health-check).
const HEALTH_PATH = '/health';

// Tempo máximo de espera por URL ao fazer ping.
const PING_TIMEOUT_MS = 3000;

// Chave de cache para salvar a baseURL detectada no AsyncStorage.
const CACHE_KEY = 'api_base_url_selected_v2';

/**
 * Faz um "ping" HTTP ao endpoint de saúde para verificar se a URL responde.
 */
async function ping(url: string): Promise<boolean> {
    try {
        const res = await axios.get(url, {
            timeout: PING_TIMEOUT_MS,
            headers: { 'Cache-Control': 'no-cache' },
        });
        return res.status >= 200 && res.status < 300;
    } catch {
        return false;
    }
}

/**
 * Seleciona a primeira baseURL alcançável (APENAS em desenvolvimento):
 * 1) Tenta a URL em cache (se existir e responder)
 * 2) Testa as URLs candidatas na ordem definida
 * 3) Se todas falharem, usa o fallback (primeira da lista)
 */
async function pickReachableBaseURL(): Promise<string> {
    // Em produção, SEMPRE retorna a URL de produção
    if (!IS_DEVELOPMENT) {
        return PRODUCTION_API_URL;
    }

    // 1) Tenta cache e limpa se estiver inválido
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            const ok = await ping(`${cached}${HEALTH_PATH}`);
            if (ok) return cached;
            await AsyncStorage.removeItem(CACHE_KEY);
        }
    } catch {}

    // 2) Tenta as candidatas em ordem
    for (const base of DEV_CANDIDATE_URLS) {
        const ok = await ping(`${base}${HEALTH_PATH}`);
        if (ok) {
            await AsyncStorage.setItem(CACHE_KEY, base);
            return base;
        }
    }

    // 3) Fallback seguro: em Android prioriza 10.0.2.2 se existir
    if ((Platform as any)?.OS === 'android') {
        const emulator = DEV_CANDIDATE_URLS.find(u => u.includes('10.0.2.2'));
        if (emulator) return emulator;
    }
    return DEV_CANDIDATE_URLS[0];
}

// ============================================================================
// DEFINIÇÃO DA BASE URL
// ============================================================================

// Em PRODUÇÃO: usa URL fixa de produção
// Em DESENVOLVIMENTO: usa primeira URL candidata até autodetecção ajustar
const API_BASE_URL = IS_DEVELOPMENT
    ? DEV_CANDIDATE_URLS[0]
    : PRODUCTION_API_URL;

// Log para debug (será removido em produção pelo bundler)
if (IS_DEVELOPMENT) {
    console.log('[API] Modo desenvolvimento - URL inicial:', API_BASE_URL);
} else {
    console.log('[API] Modo produção - URL:', PRODUCTION_API_URL);
}

// ============================================================================
// INSTÂNCIA DO AXIOS
// ============================================================================

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Timeout aumentado para conexões móveis
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================================
// GERENCIAMENTO DE TOKEN
// ============================================================================

let currentToken: string | null = null;

/**
 * Define (ou remove) o token de autenticação no cliente Axios e no cache em memória.
 */
export function setAuthToken(token: string | null): void {
    currentToken = token ?? null;
    const authHeader = token ? `Bearer ${token}` : undefined;
    const h: any = (api.defaults.headers as any).common ?? (api.defaults.headers as any);
    if (typeof h.set === 'function') {
        if (authHeader) {
            h.set('Authorization', authHeader);
        } else {
            h.delete?.('Authorization');
        }
    } else {
        if (authHeader) {
            h.Authorization = authHeader;
        } else {
            delete h.Authorization;
        }
    }
}

/**
 * Remove o token atual tanto do cache em memória quanto do header default do Axios.
 */
export function clearAuthToken(): void {
    setAuthToken(null);
}

// ============================================================================
// INTERCEPTORS
// ============================================================================

// Interceptor para adicionar token e garantir baseURL correta em dev.
api.interceptors.request.use(async (config) => {
    // Aguarda autodetecção inicial em desenvolvimento
    if (IS_DEVELOPMENT && detectionPromise) {
        try { await detectionPromise; } catch {}
    }

    // Usa token em memória; se não houver, tenta resgatar do AsyncStorage
    if (!currentToken) {
        const stored = await AsyncStorage.getItem('token');
        if (stored) setAuthToken(stored);
    }

    // Anexa o header Authorization
    if (currentToken) {
        const authValue = `Bearer ${currentToken}`;
        if (config.headers && typeof (config.headers as any).set === 'function') {
            (config.headers as any).set('Authorization', authValue);
        } else {
            config.headers = {
                ...(config.headers as Record<string, string> | undefined),
                Authorization: authValue,
            } as any;
        }
    }
    return config;
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Reporta falhas HTTP (exceto cancelamentos)
        try {
            const isCanceled = error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';
            if (!isCanceled) {
                const cfg = error?.config ?? {};
                const res = error?.response ?? {};
                captureException(error, {
                    tags: {
                        layer: 'api',
                        method: String(cfg.method || 'GET').toUpperCase(),
                        status: String(res.status || 'unknown'),
                    },
                    extra: {
                        url: cfg.baseURL ? `${cfg.baseURL}${cfg.url || ''}` : cfg.url,
                        requestHeaders: cfg.headers,
                        statusText: res.statusText,
                        responseData: res.data,
                    },
                });
            }
        } catch {}
        
        if (error.response?.status === 401) {
            clearAuthToken();
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

// ============================================================================
// AUTODETECÇÃO (APENAS EM DESENVOLVIMENTO)
// ============================================================================

let detectionPromise: Promise<void> | null = null;
const IS_TEST = typeof (globalThis as any).__TEST__ !== 'undefined' ? (globalThis as any).__TEST__ : false;

if (IS_DEVELOPMENT && !IS_TEST) {
    detectionPromise = (async () => {
        try {
            const base = await pickReachableBaseURL();
            if (base && base !== api.defaults.baseURL) {
                api.defaults.baseURL = base;
                console.log(`[API] baseURL detectada: ${base}`);
            }
        } catch {
            // Mantém base inicial se falhar a autodetecção
        }
    })();
}

export default api;
