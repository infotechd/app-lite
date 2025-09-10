export const MESSAGES = {
    // Sucesso
    SUCCESS: {
        LOGIN: 'Login realizado com sucesso!',
        REGISTER: 'Conta criada com sucesso!',
        LOGOUT: 'Logout realizado com sucesso!',
        PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
    },

    // Erros
    ERROR: {
        NETWORK: 'Erro de conexão. Verifique sua internet.',
        INVALID_CREDENTIALS: 'Email ou senha incorretos.',
        EMAIL_EXISTS: 'Este email já está cadastrado.',
        REQUIRED_FIELD: 'Este campo é obrigatório.',
        INVALID_EMAIL: 'Email inválido.',
        INVALID_PHONE: 'Telefone inválido. Use formato: (11) 99999-9999',
        PASSWORD_TOO_SHORT: 'Senha deve ter no mínimo 6 caracteres.',
        GENERIC: 'Ocorreu um erro inesperado.',
        UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    },

    // Validação
    VALIDATION: {
        REQUIRED: 'Campo obrigatório',
        EMAIL_INVALID: 'Email inválido',
        PASSWORD_MIN: 'Mínimo 6 caracteres',
        PHONE_INVALID: 'Formato: (11) 99999-9999',
        NAME_MIN: 'Mínimo 2 caracteres',
        NAME_MAX: 'Máximo 100 caracteres',
    },

    // Loading
    LOADING: {
        LOGIN: 'Fazendo login...',
        REGISTER: 'Criando conta...',
        LOADING: 'Carregando...',
        SAVING: 'Salvando...',
    },
} as const;