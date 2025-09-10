import api from './api';
import { API_CONFIG } from '@/constants/config';
import type { RegisterData, User } from '@/types';

// Tipos de apoio
export interface AuthResponse {
    token: string;
    user: User;
}

type BackendUserTipo = 'comprador' | 'prestador' | 'anunciante';

type AnyObject = Record<string, any>;

// Mapeia o tipo do app (en-US) para o backend (pt-BR)
const toBackendTipo = (t: User['tipo']): BackendUserTipo => {
    switch (t) {
        case 'buyer':
            return 'comprador';
        case 'provider':
            return 'prestador';
        case 'advertiser':
        default:
            return 'anunciante';
    }
};

// Converte o tipo do backend para o app (aceita pt-BR e en-US)
const toAppTipo = (t: string): User['tipo'] => {
    const v = t.toLowerCase();
    switch (v) {
        case 'comprador':
        case 'buyer':
            return 'buyer';
        case 'prestador':
        case 'provider':
            return 'provider';
        case 'anunciante':
        case 'advertiser':
            return 'advertiser';
        default:
            // fallback seguro quando valor ausente ou desconhecido
            return 'buyer';
    }
};

// Normaliza o usuário retornado pelo backend para o tipo do app
const normalizeUser = (u: AnyObject): User => ({
    _id: String(u._id ?? u.id ?? ''),
    nome: String(u.nome ?? u.name ?? ''),
    email: String(u.email ?? ''),
    tipo: toAppTipo(u.tipo ?? u.role ?? ''),
    avatar: u.avatar ?? undefined,
    telefone: u.telefone ?? u.phone ?? undefined,
    localizacao: u.localizacao ?? u.location ?? undefined,
    avaliacao: u.avaliacao ?? u.rating ?? undefined,
    createdAt: String(u.createdAt ?? new Date().toISOString()),
});

// Extrai { token, user } de respostas variadas do backend
const extractAuthResponse = (data: AnyObject): AuthResponse => {
    // Formatos suportados:
    // 1) { token, user }
    // 2) { success, data: { token, user } }
    // 3) { data: { token, user } }
    // 4) { token, data: user }
    const inner = ((): AnyObject => {
        if (data?.token && data?.user) return data;
        if (data?.data?.token && data?.data?.user) return data.data;
        if (data?.data && (data?.data?.token || data?.data?.user)) return data.data;
        return data;
    })();

    const token: string = String(inner.token ?? inner.accessToken ?? inner.jwt ?? '');
    const rawUser: AnyObject = inner.user ?? inner.data ?? {};

    if (!token || !rawUser) {
        throw new Error('Resposta de autenticação inválida.');
    }

    return { token, user: normalizeUser(rawUser) };
};

export const AuthService = {
    // Login com mapeamento password -> senha
    async login(payload: { email: string; password: string }): Promise<AuthResponse> {
        try {
            const body = { email: payload.email, senha: payload.password };
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/login`, body);
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao fazer login.';
            throw new Error(message);
        }
    },

    // Registro com mapeamento password -> senha e tipo en-US -> pt-BR
    async register(payload: RegisterData): Promise<AuthResponse> {
        try {
            const body: AnyObject = {
                nome: payload.nome,
                email: payload.email,
                senha: payload.password,
                tipo: toBackendTipo(payload.tipo),
            };
            if (payload.telefone && payload.telefone.trim() !== '') {
                body.telefone = payload.telefone;
            }
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/register`, body);
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao registrar.';
            throw new Error(message);
        }
    },

    async logout(): Promise<void> {
        // Caso haja endpoint no backend, poderíamos chamar aqui.
        return Promise.resolve();
    },
};

// Alias de compatibilidade com imports existentes
export const authService = AuthService;
