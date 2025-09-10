import { z } from 'zod';
import { VALIDATION_CONFIG, MESSAGES } from '@/constants';
import { parseCurrencyBRLToNumber } from '@/utils/currency';

// Schema de login
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .email(MESSAGES.VALIDATION.EMAIL_INVALID),
    senha: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .min(VALIDATION_CONFIG.PASSWORD_MIN_LENGTH, MESSAGES.VALIDATION.PASSWORD_MIN),
});

// Schema de registro (app usa 'password' e tipo em en-US)
export const registerSchema = z.object({
    nome: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .min(VALIDATION_CONFIG.NAME_MIN_LENGTH, MESSAGES.VALIDATION.NAME_MIN)
        .max(VALIDATION_CONFIG.NAME_MAX_LENGTH, MESSAGES.VALIDATION.NAME_MAX),
    email: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .email(MESSAGES.VALIDATION.EMAIL_INVALID),
    password: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .min(VALIDATION_CONFIG.PASSWORD_MIN_LENGTH, MESSAGES.VALIDATION.PASSWORD_MIN),
    telefone: z
        .string()
        .regex(VALIDATION_CONFIG.PHONE_REGEX, MESSAGES.VALIDATION.PHONE_INVALID)
        .optional()
        .or(z.literal('')),
    tipo: z.enum(['buyer', 'provider', 'advertiser']),
});

// ===== Schema de Criar Oferta (sem endereço, mídia máx 5) =====
export type MediaConfig = {
    MAX_FILES: number;
    MAX_SIZE: number;
    ALLOWED_TYPES: readonly ['image/jpeg', 'image/png', 'video/mp4'];
};

export const OFERTA_MEDIA_CONFIG: MediaConfig = {
    MAX_FILES: 5,
    MAX_SIZE: 10 * 1024 * 1024, // 10MB por arquivo
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'video/mp4'] as const,
};

const mediaFileSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(OFERTA_MEDIA_CONFIG.ALLOWED_TYPES),
    size: z.number().positive().max(OFERTA_MEDIA_CONFIG.MAX_SIZE).optional(),
});

export const criarOfertaSchema = z.object({
    titulo: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
    descricao: z.string().min(10, 'Mínimo 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
    precoText: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .refine((v) => /\d/.test(v), 'Preço inválido')
        .refine((v) => parseCurrencyBRLToNumber(v) > 0, 'Preço deve ser maior que 0'),
    categoria: z.string().min(1, 'Selecione uma categoria'),
    cidade: z.string().min(1, MESSAGES.VALIDATION.REQUIRED),
    estado: z.string().min(2, 'UF inválida').max(2, 'Use UF, ex: SP'),
    mediaFiles: z
        .array(mediaFileSchema)
        .max(OFERTA_MEDIA_CONFIG.MAX_FILES, `Máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos`)
        .refine((arr) => arr.every((f) => OFERTA_MEDIA_CONFIG.ALLOWED_TYPES.includes(f.type as any)), 'Apenas JPG, PNG ou MP4')
        .default([]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MediaFile = z.infer<typeof mediaFileSchema>;
export type CriarOfertaForm = z.infer<typeof criarOfertaSchema>;