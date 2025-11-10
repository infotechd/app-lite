import api from './api';
import { API_CONFIG } from '@/constants/config';
// ✅ Importa os tipos corretos (que já corrigimos em user.ts)
import type { RegisterData, User, LoginData } from '@/types';

// Tipos de apoio
export interface AuthResponse {
    token: string;
    user: User;
}

type BackendUserTipo = 'comprador' | 'prestador' | 'anunciante';

type AnyObject = Record<string, any>;

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
            return 'buyer';
    }
};

// Normaliza o usuário retornado pelo backend para o tipo do app
// ✅ CORREÇÃO: Atualizado para incluir os novos campos de PF/PJ
const normalizeUser = (u: AnyObject): User => ({
    id: String(u._id ?? u.id ?? ''), // Garante 'id'
    nome: String(u.nome ?? u.name ?? ''),
    email: String(u.email ?? ''),
    tipo: toAppTipo(u.tipo ?? u.role ?? ''),
    avatar: u.avatar ?? undefined,
    telefone: u.telefone ?? u.phone ?? undefined,
    localizacao: u.localizacao ?? u.location ?? undefined,
    avaliacao: u.avaliacao ?? u.rating ?? undefined,
    createdAt: String(u.createdAt ?? new Date().toISOString()),
    updatedAt: String(u.updatedAt ?? new Date().toISOString()),

    // ✅ NOVO: Campos de PF/PJ
    tipoPessoa: (u.tipoPessoa === 'PJ') ? 'PJ' : 'PF',
    cpf: u.cpf ?? undefined,
    cnpj: u.cnpj ?? undefined,
    razaoSocial: u.razaoSocial ?? undefined,
    nomeFantasia: u.nomeFantasia ?? undefined,
    ativo: u.ativo ?? false,
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

    if (!token || !rawUser.id) { // Checa se o 'id' existe no usuário normalizado
        // Se não houver 'id', tenta normalizar
        const normalizedUser = normalizeUser(rawUser);
        if (token && normalizedUser.id) {
            return { token, user: normalizedUser };
        }
        // Se ainda falhar, lança o erro
        throw new Error('Resposta de autenticação inválida.');
    }

    return { token, user: normalizeUser(rawUser) };
};

export const AuthService = {
    // ✅ CORREÇÃO: Login agora envia 'password', como o backend (authValidation.ts) espera
    async login(payload: LoginData): Promise<AuthResponse> {
        try {
            // O backend authValidation.ts espera 'password' e o transforma em 'senha'
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/login`, payload);
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao fazer login.';
            throw new Error(message);
        }
    },

    // ✅ CORREÇÃO: Registro agora envia o 'payload' COMPLETO
    async register(payload: RegisterData): Promise<AuthResponse> {
        try {
            // Normaliza documentos (CPF/CNPJ) e envia apenas o relevante
            const onlyDigits = (s?: string) => (s ?? '').replace(/\D/g, '');
            const body: Record<string, any> = { ...payload };

            if (payload.tipoPessoa === 'PJ') {
                body.cnpj = onlyDigits(payload.cnpj);
                delete body.cpf; // evita enviar CPF quando PJ
            } else {
                body.cpf = onlyDigits(payload.cpf);
                delete body.cnpj; // evita enviar CNPJ quando PF
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