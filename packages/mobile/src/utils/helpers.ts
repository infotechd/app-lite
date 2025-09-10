import { AppError } from '@/types';
import { MESSAGES } from '@/constants';

// Formatar telefone
export const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);

    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return phone;
};

// Validar telefone
export const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
};

// Formatar nome
export const formatName = (name: string): string => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Extrair iniciais do nome
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Tratar erros da API
export const handleApiError = (error: any): AppError => {
    if (error.response?.data?.message) {
        return {
            message: error.response.data.message,
            code: error.response.status?.toString(),
        };
    }

    if (error.response?.data?.errors) {
        const firstError = error.response.data.errors[0];
        return {
            message: firstError.message,
            field: firstError.field,
        };
    }

    if (error.code === 'NETWORK_ERROR') {
        return {
            message: MESSAGES.ERROR.NETWORK,
            code: 'NETWORK_ERROR',
        };
    }

    return {
        message: MESSAGES.ERROR.GENERIC,
        code: 'UNKNOWN_ERROR',
    };
};

// Delay para testes
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Truncar texto
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

// Capitalizar primeira letra
export const capitalize = (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};