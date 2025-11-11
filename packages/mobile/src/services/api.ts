// Serviço HTTP (Axios) central do app mobile.
// - Define baseURL dinâmica em desenvolvimento (autodetecção dos IPs locais)
// - Configura headers e timeouts padrão
// - Gerencia token JWT em memória e via AsyncStorage
// - Intercepta requests/responses para anexar token e tratar erros comuns
// - Fornece utilitários para sobrepor a baseURL manualmente em debug

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import envConfig from '@/constants/config';

// Garante que a baseURL do Axios sempre termine com '/'
function ensureTrailingSlash(u: string): string {
    return u.endsWith('/') ? u : `${u}/`;
}

/**
 * Autodetecção de IPs do backend em desenvolvimento.
 * - Casa: 192.168.15.12 (exemplo)
 * - Trabalho: 192.168.1.12 (exemplo)
 * - Emulador Android: 10.0.2.2 (IP especial que aponta para o host)
 * - iOS Simulator: 127.0.0.1
 *
 * Em produção, a URL deve permanecer fixa (domínio público do backend).
 *
 * MELHORIA: Tornar essa lista configurável por ambiente (.env) e/ou por plataforma
 * (ex.: usando react-native-config), evitando editar código para cada rede.
 */
// Monta lista de URLs candidatas, priorizando a do ambiente (config.ts) quando em dev
const env = envConfig;
const baseCandidates: string[] = [
    env?.apiUrl || '',
    'http://192.168.1.54:4000/api', // Casa — IP da sua casa
    'http://192.168.1.12:4000/api',  // Trabalho — IP do seu trabalho
    'http://192.168.15.12:4000/api', // Casa — faixa alternativa 192.168.15.x
    'http://192.168.15.1:4000/api',  // Casa — gateway/roteador comum
    'http://10.0.2.2:4000/api',      // Emulador Android (host do PC)
    'http://127.0.0.1:4000/api',     // iOS Simulator (host local)
    'http://localhost:4000/api'
];
// Remove vazios e duplicados preservando a ordem
const CANDIDATE_BASE_URLS: string[] = Array.from(new Set(baseCandidates.filter(Boolean)));

// Endpoint leve já existente no backend para checagem de saúde (health-check).
// Espera-se que GET /api/health responda rapidamente com 200 OK.
const HEALTH_PATH = '/health'; // GET /api/health

// Tempo máximo de espera por URL ao fazer ping.
// MELHORIA: Tornar esse timeout configurável e/ou aumentar em redes lentas.
const PING_TIMEOUT_MS = 3000;

// Chave de cache para salvar a baseURL detectada no AsyncStorage.
// MELHORIA: Incluir versão do app na chave para invalidar cache em upgrades.
const CACHE_KEY = 'api_base_url_selected';

/**
 * Faz um "ping" HTTP ao endpoint de saúde para verificar se a URL responde.
 * Retorna true se a resposta for ok (status 2xx), false caso contrário.
 * Usa AbortController para limitar o tempo de espera (timeout).
 */
async function ping(url: string): Promise<boolean> {
    try {
        const res = await axios.get(url, {
            timeout: PING_TIMEOUT_MS,
            headers: { 'Cache-Control': 'no-cache' },
            // Evita uso de baseURL global; URL absoluta garante request direto
        });
        return res.status >= 200 && res.status < 300;
    } catch {
        return false;
    }
}

/**
 * Seleciona a primeira baseURL alcançável:
 * 1) Tenta a URL em cache (se existir e responder)
 * 2) Testa as URLs candidatas na ordem definida
 * 3) Se todas falharem, usa o fallback (primeira da lista)
 *
 * Ao encontrar uma URL válida, salva no AsyncStorage para acelerar próximos inícios.
 *
 * MELHORIA: Testar as URLs em paralelo (Promise.any) para acelerar a detecção.
 */
async function pickReachableBaseURL(): Promise<string> {
    // 1) Tenta cache e limpa se estiver inválido
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            const ok = await ping(`${cached}${HEALTH_PATH}`);
            if (ok) return cached;
            // Remove cache inválido para evitar reaproveitar URL ruim
            await AsyncStorage.removeItem(CACHE_KEY);
        }
    } catch {}

    // 2) Tenta as candidatas em ordem
    for (const base of CANDIDATE_BASE_URLS) {
        const ok = await ping(`${base}${HEALTH_PATH}`);
        if (ok) {
            await AsyncStorage.setItem(CACHE_KEY, base);
            return base;
        }
    }

    // 3) Fallback seguro: em Android prioriza 10.0.2.2 se existir; não cacheia
    if ((Platform as any)?.OS === 'android') {
        const emulator = CANDIDATE_BASE_URLS.find(u => u.includes('10.0.2.2'));
        if (emulator) return emulator;
    }
    return CANDIDATE_BASE_URLS[0];
}

// Base inicial:
// - Em desenvolvimento, começamos com a primeira candidata (Casa) até a autodetecção ajustar.
// - Em produção, defina sua URL pública fixa do backend.
// MELHORIA: Pegar a URL de produção de uma variável de ambiente segura.
const API_BASE_URL = (typeof __DEV__ !== 'undefined' && __DEV__)
    ? CANDIDATE_BASE_URLS[0] // Casa — inicial até detectar melhor opção
    : 'https://your-production-api.com/api';

// Instância principal do Axios que será usada em todo o app.
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // Timeout padrão para requests
    headers: {
        'Content-Type': 'application/json', // Padrão para JSON
        // MELHORIA: Não fixar globalmente para permitir multipart/form-data sem conflito.
        // Alternativas: definir por request ou usar transformRequest.
    },
});

// Mantém um token em memória para evitar leituras frequentes do AsyncStorage
// MELHORIA: Armazenar o token em storage seguro (Keychain/Keystore) via libs como
// react-native-keychain ou expo-secure-store; AsyncStorage não é criptografado.
let currentToken: string | null = null;

/**
 * Define (ou remove) o token de autenticação no cliente Axios e no cache em memória.
 * - Atualiza Authorization em api.defaults.headers para requests subsequentes.
 * - Suporta tanto AxiosHeaders (com .set/.delete) quanto objeto simples.
 */
export function setAuthToken(token: string | null): void {
    currentToken = token ?? null;
    const authHeader = token ? `Bearer ${token}` : undefined;
    const h: any = (api.defaults.headers as any).common ?? (api.defaults.headers as any);
    if (typeof h.set === 'function') {
        // AxiosHeaders
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

// Interceptor para adicionar token e garantir baseURL correta em dev.
api.interceptors.request.use(async (config) => {
    // Aguarda autodetecção inicial em desenvolvimento, para evitar 1ª requisição no IP errado
    if (__DEV__ && detectionPromise) {
        try { await detectionPromise; } catch {}
    }

    // Usa token em memória; se não houver, tenta resgatar do AsyncStorage uma única vez
    // MELHORIA: Carregar o token em memória assim que o app inicia para evitar custo aqui.
    if (!currentToken) {
        const stored = await AsyncStorage.getItem('token');
        if (stored) setAuthToken(stored);
    }

    // Anexa o header Authorization, compatível com AxiosHeaders ou objeto simples
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

// Interceptor para tratar erros de resposta (ex.: 401 não autorizado)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token inválido/expirado: limpa credenciais locais.
            // MELHORIA: Implementar fluxo de refresh token antes de deslogar o usuário.
            clearAuthToken();
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

/**
 * Autodetecção em background (somente em desenvolvimento):
 * - Testa o cache e depois os IPs: Casa, Trabalho, Emuladores
 * - Atualiza api.defaults.baseURL assim que encontrar um que responda
 * - Salva a escolha no AsyncStorage para os próximos inícios
 *
 * MELHORIA: Logar/telerastrear quando a baseURL for trocada para facilitar debug.
 */
let detectionPromise: Promise<void> | null = null;
if (__DEV__) {
    detectionPromise = (async () => {
        try {
            const base = await pickReachableBaseURL();
            if (base && base !== api.defaults.baseURL) {
                api.defaults.baseURL = base;
                // console.log(`[API] baseURL detectada: ${base}`);
            }
        } catch {
            // Mantém base inicial se falhar a autodetecção
        }
    })();
}

// Helper opcional para mudar manualmente a base (ex.: tela de debug)
// Também persiste a escolha no AsyncStorage para reutilização futura.
export async function overrideBaseURL(url: string) {
    api.defaults.baseURL = url;
    await AsyncStorage.setItem(CACHE_KEY, url);
}

export default api;