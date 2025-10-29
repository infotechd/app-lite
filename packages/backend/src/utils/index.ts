// Barrel file for utils: exposes logger (default and named) and JWT helpers
export { default } from './logger';
export { logger, loggerUtils, requestLogger } from './logger';
export { signAccessToken, verifyJwtWithRotation, signRefreshToken } from './jwt';

// Conteúdo a ser adicionado/modificado em packages/backend/src/utils/index.ts

// Função para remover acentos
const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Função para capitalizar e normalizar
export const capitalize = (s: string): string => {
    if (!s) return s;
    const normalized = removeAccents(s);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

// ... (mantenha o restante do seu index.ts)

