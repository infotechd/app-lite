import * as Updates from 'expo-updates';

// Configurações de ambiente
const ENV = {
    dev: {
        apiUrl: 'http://192.168.15.12:4000/api',
        amplitudeApiKey: null,
        debug: true,
    },
    staging: {
        apiUrl: 'https://staging-api.superapp.com/api',
        amplitudeApiKey: 'your-staging-key',
        debug: false,
    },
    prod: {
        apiUrl: 'https://api.superapp.com/api',
        amplitudeApiKey: 'your-prod-key',
        debug: false,
    },
};

// Configuração de tema
// Nota: expomos tanto chaves em minúsculas quanto em MAIÚSCULAS para compatibilidade retroativa.
export const THEME_CONFIG = {
    // Versão minúscula (camelCase)
    colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        background: '#F2F2F7',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#8E8E93',
        border: '#C6C6C8',
        placeholder: '#C7C7CD',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 50,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 28,
    },
    fontWeight: {
        light: '300' as const,
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
        },
    },

    // Versão MAIÚSCULA (UPPER_SNAKE_CASE like) - aliases
    COLORS: {
        PRIMARY: '#007AFF',
        SECONDARY: '#5856D6',
        SUCCESS: '#34C759',
        WARNING: '#FF9500',
        ERROR: '#FF3B30',
        BACKGROUND: '#F2F2F7',
        SURFACE: '#FFFFFF',
        TEXT: '#000000',
        TEXT_SECONDARY: '#8E8E93',
        BORDER: '#C6C6C8',
        PLACEHOLDER: '#C7C7CD',
    },
    SPACING: {
        XS: 4,
        SM: 8,
        MD: 16,
        LG: 24,
        XL: 32,
        XXL: 40,
    },
    BORDER_RADIUS: {
        SM: 4,
        MD: 8,
        LG: 12,
        XL: 16,
        ROUND: 50,
    },
    FONT_SIZE: {
        XS: 12,
        SM: 14,
        MD: 16,
        LG: 18,
        XL: 20,
        XXL: 24,
        XXXL: 28,
    },
    FONT_WEIGHT: {
        LIGHT: '300' as const,
        NORMAL: '400' as const,
        MEDIUM: '500' as const,
        SEMIBOLD: '600' as const,
        BOLD: '700' as const,
    },
    SHADOWS: {
        SM: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        MD: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        LG: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
        },
    },
} as const;

// Chaves de armazenamento
export const STORAGE_KEYS = {
    USER_TOKEN: '@superapp:user_token',
    USER_DATA: '@superapp:user_data',
    THEME_PREFERENCE: '@superapp:theme',
    LANGUAGE_PREFERENCE: '@superapp:language',
    ONBOARDING_COMPLETED: '@superapp:onboarding',
    LAST_SYNC: '@superapp:last_sync',
    SEARCH_HISTORY: '@superapp:search_history',
    FAVORITES: '@superapp:favorites',
    // Alias para compatibilidade com SecureStore
    AUTH_TOKEN: '@superapp:user_token',
} as const;

// Configurações de validação
export const VALIDATION_CONFIG = {
    email: {
        required: 'Email é obrigatório',
        invalid: 'Email inválido',
        maxLength: 255,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
        required: 'Senha é obrigatória',
        minLength: 6,
        maxLength: 50,
        weak: 'Senha muito fraca',
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
    },
    name: {
        required: 'Nome é obrigatório',
        minLength: 2,
        maxLength: 100,
        invalid: 'Nome deve conter apenas letras e espaços',
        pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
    },
    phone: {
        required: 'Telefone é obrigatório',
        invalid: 'Telefone inválido',
        pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
    },
    cpf: {
        required: 'CPF é obrigatório',
        invalid: 'CPF inválido',
        pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    },
    general: {
        required: 'Campo obrigatório',
        invalid: 'Valor inválido',
        tooShort: 'Valor muito curto',
        tooLong: 'Valor muito longo',
    },
    // Aliases esperados por schemas
    PASSWORD_MIN_LENGTH: 6,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    PHONE_REGEX: /^(\(\d{2}\)\s\d{4,5}-\d{4})$/,
} as const;

// Configurações da API
export const API_CONFIG = {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    endpoints: {
        auth: '/auth',
        users: '/users',
        ofertas: '/ofertas',
        anuncios: '/anuncios',
        upload: '/upload',
    },
};

// Configurações do app
export const APP_CONFIG = {
    name: 'Super App',
    version: '1.0.0',
    supportEmail: 'suporte@superapp.com',
    privacyPolicyUrl: 'https://superapp.com/privacy',
    termsOfServiceUrl: 'https://superapp.com/terms',
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },
};

// Função para obter variáveis de ambiente
const getEnvVars = () => {
    // Durante desenvolvimento local
    if (__DEV__) return ENV.dev;

    // Em builds/updates, use o canal do EAS Updates
    const channel = Updates.channel ?? 'production';
    if (channel === 'staging') return ENV.staging;
    return ENV.prod;
};

export default getEnvVars();