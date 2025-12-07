import { z } from 'zod';
import { VALIDATION_CONFIG, MESSAGES } from '@/constants';
import { parseCurrencyBRLToNumber } from '@/utils/currency';
import { removeNonNumeric } from './phoneFormatter';

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
    telefone: z.string().optional().refine(
        (val) => {
            if (!val || val.trim() === '') return true;
            const numbers = removeNonNumeric(val);
            return numbers.length === 10 || numbers.length === 11;
        },
        { message: 'Telefone inválido' }
    ),
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
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'video/mp4'] as const,
};

const IMAGE_MAX = 10 * 1024 * 1024;  // 10MB
const VIDEO_MAX = 50 * 1024 * 1024;  // 50MB

const mediaFileSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(OFERTA_MEDIA_CONFIG.ALLOWED_TYPES),
    size: z.number().positive().optional(),
}).superRefine((f, ctx) => {
    if (f.size == null) return; // se faltar size, não valida tamanho
    if (f.type === 'video/mp4' && f.size > VIDEO_MAX) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vídeo acima de 50MB' });
    }
    if ((f.type === 'image/jpeg' || f.type === 'image/png') && f.size > IMAGE_MAX) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Imagem acima de 10MB' });
    }
});

export const PRICE_UNITS = ['hora','diaria','mes','aula','pacote'] as const;
export type PriceUnit = typeof PRICE_UNITS[number];

export const criarOfertaSchema = z.object({
    titulo: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
    descricao: z.string().min(10, 'Mínimo 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
    precoText: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .refine((v) => /\d/.test(v), 'Preço inválido')
        .refine((v) => parseCurrencyBRLToNumber(v) > 0, 'Preço deve ser maior que 0'),
    priceUnit: z.enum(PRICE_UNITS, { required_error: 'Selecione a unidade do preço' }),
    categoria: z.string().min(1, 'Selecione uma categoria'),
    subcategoria: z.string().optional(),
    cidade: z.string().min(1, MESSAGES.VALIDATION.REQUIRED),
    estado: z.string().min(2, 'UF inválida').max(2, 'Use UF, ex: SP'),
    mediaFiles: z
        .array(mediaFileSchema)
        .max(OFERTA_MEDIA_CONFIG.MAX_FILES, `Máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos`)
        .default([]),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MediaFile = z.infer<typeof mediaFileSchema>;
export type CriarOfertaForm = z.infer<typeof criarOfertaSchema>;