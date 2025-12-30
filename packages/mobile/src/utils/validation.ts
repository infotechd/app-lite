/**
 * Módulo de validações de formulários (Mobile)
 *
 * Este arquivo centraliza os schemas do Zod usados para validar entradas
 * de usuários no app (login, registro e criação de oferta), além de tipos
 * utilitários e configurações relacionadas a mídia.
 *
 * Notas importantes:
 * - Comentários estão em Português BR, com TSDoc/JSDoc acima de cada export
 *   e comentários inline nos trechos com regras específicas (refine/superRefine).
 * - Não há alteração de comportamento em relação ao código original; apenas
 *   documentação e comentários foram adicionados para maior clareza.
 */
import { Platform } from 'react-native';
import { z } from 'zod';
import { MESSAGES } from '@/constants';
import { parseCurrencyBRLToNumber } from '@/utils/currency';


// Tipos base sempre permitidos
const BASE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4'] as const;
// Tipos adicionais para iOS (convertidos no servidor)
const IOS_ADDITIONAL_TYPES = ['video/quicktime', 'image/heic'] as const;
export const PLATFORM_ALLOWED_TYPES = Platform.OS === 'ios'
    ? [...BASE_ALLOWED_TYPES, ...IOS_ADDITIONAL_TYPES] as const
    : BASE_ALLOWED_TYPES;
export type AllowedMimeType = typeof PLATFORM_ALLOWED_TYPES[number];

// ===== CONFIGURAÇÃO DE MÍDIA PARA OFERTAS =====
/**
 * Tipo utilitário para configuração de mídia aceita em ofertas.
 *
 * - MAX_FILES: quantidade máxima de arquivos aceitos por oferta.
 * - MAX_SIZE: tamanho máximo (bytes) aceito por arquivo.
 * - MAX_VIDEO_DURATION: duração máxima de vídeos (em segundos).
 * - ALLOWED_TYPES: tipos MIME permitidos (imagens JPEG/PNG e vídeo MP4).
 */
export type MediaConfig = {
    MAX_FILES: number;
    MAX_SIZE: number;
    MAX_VIDEO_DURATION: number; // NOVO: duração máxima em segundos
    ALLOWED_TYPES: readonly AllowedMimeType[];
};

/**
 * Configuração padrão de mídia para a criação de ofertas.
 *
 * Atualizações recentes:
 * - Duração máxima de vídeo aumentada para 20 segundos.
 * - Tamanho máximo de arquivo aumentado para 100MB para suportar vídeos maiores.
 */
export const OFERTA_MEDIA_CONFIG: MediaConfig = {
    MAX_FILES: 6,
    MAX_SIZE: 100 * 1024 * 1024, // 100MB (aumentado para suportar vídeos de 20s)
    MAX_VIDEO_DURATION: 20, // ALTERADO: de 15 para 20 segundos
    ALLOWED_TYPES: PLATFORM_ALLOWED_TYPES,
};

// Limites de tamanho por tipo de mídia
const IMAGE_MAX = 10 * 1024 * 1024;  // 10MB para imagens
const VIDEO_MAX = 100 * 1024 * 1024;  // 100MB para vídeos (aumentado)

/**
 * Schema de um arquivo de mídia aceito na criação de oferta.
 *
 * Campos:
 * - uri: string obrigatória com a localização do arquivo no dispositivo.
 * - name: nome do arquivo (obrigatório).
 * - type: tipo MIME, limitado aos tipos permitidos pela configuração.
 * - size: tamanho do arquivo em bytes (opcional; se presente, será validado).
 *
 * Regras adicionais (superRefine):
 * - Se size não estiver presente, nenhuma regra de tamanho é aplicada.
 * - Para vídeos (video/mp4): máximo 100MB.
 * - Para imagens (jpeg/png): máximo 10MB.
 *
 * @returns ZodSchema para um item de mídia individual.
 */
const mediaFileSchema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(OFERTA_MEDIA_CONFIG.ALLOWED_TYPES as [AllowedMimeType, ...AllowedMimeType[]]),
    size: z.number().positive().optional(),
}).superRefine((f, ctx) => {
    if (f.size == null) return; // se não houver informação de tamanho, não valida limite
    if (f.type === 'video/mp4' && f.size > VIDEO_MAX) {
        // vídeo excede limite máximo permitido
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vídeo acima de 100MB' });
    }
    if ((f.type === 'image/jpeg' || f.type === 'image/png') && f.size > IMAGE_MAX) {
        // imagem excede limite máximo permitido
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Imagem acima de 10MB' });
    }
});

/**
 * Conjunto de unidades de preço suportadas em ofertas.
 * Ex.: por hora, diária, mês, aula ou pacote.
 */
export const PRICE_UNITS = ['hora','diaria','mes','aula','pacote'] as const;
/**
 * Tipo união derivado de PRICE_UNITS. Útil para tipar seletores/inputs de unidade.
 */
export type PriceUnit = typeof PRICE_UNITS[number];

/**
 * Schema para criação/edição de Oferta.
 *
 * Campos principais:
 * - titulo: entre 3 e 100 caracteres.
 * - descricao: entre 10 e 2000 caracteres.
 * - precoText: string obrigatória; deve conter dígitos e representar valor > 0
 *   após conversão de moeda pt-BR para número (parseCurrencyBRLToNumber).
 * - priceUnit: unidade do preço (enum PRICE_UNITS), obrigatória.
 * - categoria: string obrigatória; subcategoria é opcional.
 * - cidade: obrigatória; estado: exatamente 2 caracteres (UF).
 * - mediaFiles: array de arquivos validados por mediaFileSchema, limitado por
 *   OFERTA_MEDIA_CONFIG.MAX_FILES; padrão é array vazio.
 *
 * Regras específicas do preço:
 * - A primeira refine exige ao menos um dígito na string (evita campos apenas com símbolos).
 * - A segunda refine verifica que o valor convertido é maior que zero.
 *
 * @returns ZodSchema com a estrutura esperada para o formulário de oferta.
 */
export const criarOfertaSchema = z.object({
    titulo: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
    descricao: z.string().min(10, 'Mínimo 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
    precoText: z
        .string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .refine((v) => /\d/.test(v), 'Preço inválido') // requer pelo menos um dígito
        .refine((v) => parseCurrencyBRLToNumber(v) > 0, 'Preço deve ser maior que 0'), // converte para número e valida > 0
    priceUnit: z.enum(PRICE_UNITS, { required_error: 'Selecione a unidade do preço' }),
    categoria: z.string().min(1, 'Selecione uma categoria'),
    subcategoria: z.string().optional(),
    cidade: z.string(),
    estado: z.string().min(2, 'UF inválida').max(2, 'Use UF, ex: SP'),
    mediaFiles: z
        .array(mediaFileSchema)
        .max(OFERTA_MEDIA_CONFIG.MAX_FILES, `Máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos`) // limita a quantidade de arquivos anexados
        .default([]),
}).refine((data) => {
    if (data.estado !== 'BR') {
        return data.cidade.trim().length > 0;
    }
    return true;
}, {
    message: MESSAGES.VALIDATION.REQUIRED,
    path: ['cidade'],
});

/**
 * Schema para Registro de Usuário (PF e PJ).
 * Inclui validações condicionais baseadas no tipo de pessoa e
 * transformações para garantir compatibilidade com o backend.
 */
export const registerSchema = z.object({
    email: z.string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .email(MESSAGES.VALIDATION.EMAIL_INVALID)
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(1, MESSAGES.VALIDATION.REQUIRED)
        .min(6, MESSAGES.VALIDATION.PASSWORD_MIN),
    telefone: z.string().optional(),
    tipo: z.enum(['buyer', 'provider', 'advertiser']),
    tipoPessoa: z.enum(['PF', 'PJ']),

    // Campos que variam por tipoPessoa
    nome: z.string().default(''), // obrigatório quando PF
    cpf: z.string().optional(),
    razaoSocial: z.string().optional(), // obrigatório quando PJ
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
})
.superRefine((data, ctx) => {
    // Validações específicas para Pessoa Física (PF)
    if (data.tipoPessoa === 'PF') {
        const nome = data.nome ?? '';
        if (nome.trim().length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['nome'],
                message: MESSAGES.VALIDATION.NAME_MIN
            });
        }
        const cpfDigits = (data.cpf ?? '').replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cpf'],
                message: 'CPF deve ter 11 dígitos'
            });
        }
    }

    // Validações específicas para Pessoa Jurídica (PJ)
    if (data.tipoPessoa === 'PJ') {
        const rz = data.razaoSocial ?? '';
        if (rz.trim().length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['razaoSocial'],
                message: 'Razão social é obrigatória'
            });
        }
        const cnpjDigits = (data.cnpj ?? '').replace(/\D/g, '');
        if (cnpjDigits.length !== 14) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cnpj'],
                message: 'CNPJ deve ter 14 dígitos'
            });
        }
    }
})
.transform((data) => (
    data.tipoPessoa === 'PJ'
        ? { ...data, nome: data.razaoSocial ?? '' }
        : data
));

/** Tipo inferido do schema de registro. */
export type RegisterFormData = z.infer<typeof registerSchema>;
/** Tipo inferido para um arquivo de mídia individual. */
export type MediaFile = z.infer<typeof mediaFileSchema>;
/** Tipo inferido do schema de criação de oferta. */
export type CriarOfertaForm = z.infer<typeof criarOfertaSchema>;
