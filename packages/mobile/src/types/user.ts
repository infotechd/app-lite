// packages/mobile/src/types/user.ts

/**
 * ✅ CORREÇÃO:
 * A interface 'User' foi atualizada para refletir todos os dados
 * que a API (authController.ts) retorna após o login ou registro.
 */
export interface User {
    id: string; // O backend envia 'id', não '_id'
    nome: string;
    email: string;
    tipo: 'buyer' | 'provider' | 'advertiser';
    avatar?: string;
    avatarBlurhash?: string;
    telefone?: string;
    localizacao?: {
        cidade: string;
        estado: string;
    };
    avaliacao?: number;
    createdAt: string;
    updatedAt: string; // Adicionado, pois o backend envia

    // ✅ NOVO: Campos de PF/PJ
    tipoPessoa: 'PF' | 'PJ';
    cpf?: string;
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    ativo: boolean;
}

export interface PendingRedirect {
    routeName: string;
    params?: any;
}

/**
 * ✅ CORREÇÃO:
 * A interface 'RegisterData' é a causa principal do erro.
 * Ela foi atualizada para incluir TODOS os campos que o
 * RegisterScreen.tsx (via Zod) envia para o backend.
 */
export interface RegisterData {
    nome: string; // 'nome' (para PF) ou 'razaoSocial' (para PJ, via transform)
    email: string;
    password: string;
    tipo: 'buyer' | 'provider' | 'advertiser';
    telefone?: string;

    // ✅ NOVO: Campos obrigatórios para a validação
    tipoPessoa: 'PF' | 'PJ';

    // ✅ NOVO: Campos opcionais (dependem do tipoPessoa)
    cpf?: string;
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
}

// Interface de Login (está correta)
export interface LoginData {
    email: string;
    password: string;
}

/**
 * Interface AuthContextType (nenhuma mudança estrutural necessária)
 * Ela usa as interfaces User e RegisterData, que já foram corrigidas acima.
 */
export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>; // Agora usa a RegisterData corrigida
    logout: () => void;
    pendingRedirect: PendingRedirect | null;
    setPendingRedirect: (redirect: PendingRedirect | null) => void;
    clearPendingRedirect: () => void;
    setUser: (user: User | null) => void;
}