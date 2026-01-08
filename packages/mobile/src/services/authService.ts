import api from './api';
import { API_CONFIG } from '@/constants/config';
// ✅ Importa os tipos corretos (que já corrigimos em user.ts)
import type { RegisterData, User, LoginData } from '@/types';

// Tipos de apoio
/**
 * Interface que define a estrutura de resposta de sucesso após autenticação.
 */
export interface AuthResponse {
    /** Token JWT para autorização das próximas requisições */
    token: string;
    /** Objeto do usuário autenticado */
    user: User;
}

/** Objeto genérico para manipulação de dados dinâmicos da API */
type AnyObject = Record<string, any>;

/**
 * Converte a string de tipo de usuário vinda do backend para o formato enumerado do app.
 * Aceita variações em Português e Inglês para maior compatibilidade.
 * 
 * @param {string} t - String do tipo/role recebida da API.
 * @returns {User['tipo']} - O tipo mapeado ('buyer', 'provider' ou 'advertiser').
 */
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

/**
 * Normaliza o objeto de usuário retornado pelo backend, tratando diferenças de nomes de campos
 * (como _id vs id) e campos opcionais para usuários PF (Pessoa Física) e PJ (Pessoa Jurídica).
 * 
 * @param {AnyObject} u - Objeto bruto retornado pela API.
 * @returns {User} - Objeto de usuário formatado segundo o contrato do App.
 */
const normalizeUser = (u: AnyObject): User => ({
    id: String(u._id ?? u.id ?? ''), // Garante que teremos um ID como string
    nome: String(u.nome ?? u.name ?? ''),
    email: String(u.email ?? ''),
    tipo: toAppTipo(u.tipo ?? u.role ?? ''),
    avatar: u.avatar ?? undefined,
    telefone: u.telefone ?? u.phone ?? undefined,
    localizacao: u.localizacao ?? u.location ?? undefined,
    avaliacao: u.avaliacao ?? u.rating ?? undefined,
    createdAt: String(u.createdAt ?? new Date().toISOString()),
    updatedAt: String(u.updatedAt ?? new Date().toISOString()),

    // Mapeamento de campos específicos de PF/PJ adicionados recentemente
    tipoPessoa: (u.tipoPessoa === 'PJ') ? 'PJ' : 'PF',
    cpf: u.cpf ?? undefined,
    cnpj: u.cnpj ?? undefined,
    razaoSocial: u.razaoSocial ?? undefined,
    nomeFantasia: u.nomeFantasia ?? undefined,
    ativo: u.ativo ?? false,
});

/**
 * Extrai os dados de autenticação (token e usuário) de diferentes formatos possíveis de resposta.
 * O backend pode variar o formato dependendo da versão ou endpoint.
 * 
 * @param {AnyObject} data - Resposta bruta recebida do Axios.
 * @returns {AuthResponse} - Objeto contendo token e usuário normalizado.
 * @throws {Error} - Caso a resposta seja considerada inválida.
 */
const extractAuthResponse = (data: AnyObject): AuthResponse => {
    // Tenta encontrar o objeto interno que contém os dados reais
    const inner = ((): AnyObject => {
        if (data?.token && data?.user) return data;
        if (data?.data?.token && data?.data?.user) return data.data;
        if (data?.data && (data?.data?.token || data?.data?.user)) return data.data;
        return data;
    })();

    const token: string = String(inner.token ?? inner.accessToken ?? inner.jwt ?? '');
    const rawUser: AnyObject = inner.user ?? inner.data ?? {};

    // Validação mínima para garantir que a autenticação foi bem sucedida
    if (!token || !rawUser.id) { 
        const normalizedUser = normalizeUser(rawUser);
        if (token && normalizedUser.id) {
            return { token, user: normalizedUser };
        }
        throw new Error('Resposta de autenticação inválida.');
    }

    return { token, user: normalizeUser(rawUser) };
};

/**
 * Serviço central de autenticação que encapsula as chamadas de API para o módulo de Auth.
 */
export const AuthService = {
    /**
     * Realiza o login do usuário.
     * @param {LoginData} payload - E-mail e senha do usuário.
     * @returns {Promise<AuthResponse>} - Dados de autenticação em caso de sucesso.
     */
    async login(payload: LoginData): Promise<AuthResponse> {
        try {
            // O backend espera 'password' no corpo da requisição
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/login`, payload);
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao fazer login.';
            throw new Error(message);
        }
    },

    /**
     * Registra um novo usuário (PF ou PJ).
     * @param {RegisterData} payload - Dados completos de cadastro.
     * @returns {Promise<AuthResponse>} - Dados de autenticação após o registro bem sucedido.
     */
    async register(payload: RegisterData): Promise<AuthResponse> {
        try {
            // Remove caracteres não numéricos de documentos antes de enviar
            const onlyDigits = (s?: string) => (s ?? '').replace(/\D/g, '');
            const body: Record<string, any> = { ...payload };

            // Trata condicionalmente CPF ou CNPJ baseado no tipo de pessoa
            if (payload.tipoPessoa === 'PJ') {
                body.cnpj = onlyDigits(payload.cnpj);
                delete body.cpf;
            } else {
                body.cpf = onlyDigits(payload.cpf);
                delete body.cnpj;
            }

            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/register`, body);
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao registrar.';
            throw new Error(message);
        }
    },

    /**
     * Solicita um e-mail de recuperação de senha.
     * @param {string} email - O e-mail do usuário.
     * @returns {Promise<{ message: string }>} - Mensagem de confirmação da API.
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/forgot-password`, { email });
            return { message: data?.message ?? 'Se este e-mail existir, enviaremos instruções em breve.' };
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao enviar recuperação.';
            throw new Error(message);
        }
    },

    /**
     * Redefine a senha do usuário utilizando o token enviado por e-mail.
     * @param {string} token - Token de validação de recuperação.
     * @param {string} password - A nova senha.
     * @returns {Promise<AuthResponse>} - Faz login automático após redefinir.
     */
    async resetPassword(token: string, password: string): Promise<AuthResponse> {
        try {
            const { data } = await api.post(`${API_CONFIG.endpoints.auth}/reset-password`, { token, password });
            return extractAuthResponse(data);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao redefinir senha.';
            throw new Error(message);
        }
    },

    /**
     * Finaliza a sessão do usuário. Atualmente apenas resolve localmente.
     */
    async logout(): Promise<void> {
        return Promise.resolve();
    },
};

// Alias de compatibilidade com imports existentes
export const authService = AuthService;