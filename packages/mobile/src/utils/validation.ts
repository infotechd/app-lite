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
import { z } from 'zod';
import { VALIDATION_CONFIG, MESSAGES } from '@/constants';
import { parseCurrencyBRLToNumber } from '@/utils/currency';
import { removeNonNumeric } from './phoneFormatter';

/**
 * Schema de validação para o formulário de Login.
 *
 * Campos validados:
 * - email: obrigatório e em formato válido.
 * - senha: obrigatória e com tamanho mínimo configurado.
 *
 * @returns ZodSchema com a estrutura esperada do formulário de login.
 */
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

/**
 * Schema de validação para o formulário de Registro.
 *
 * Campos validados:
 * - nome: obrigatório, com limites de tamanho mínimos e máximos.
 * - email: obrigatório e em formato válido.
 * - password: obrigatória e com tamanho mínimo.
 * - telefone: opcional; quando preenchido, deve conter 10 ou 11 dígitos (após
 *   remover caracteres não numéricos). Aceita formatos com máscara.
 * - tipo: enum fixo com os tipos de usuário aceitos.
 *
 * Regras específicas:
 * - A validação do telefone utiliza refine para permitir vazio e validar o
 *   comprimento numérico quando informado.
 *
 * @returns ZodSchema com a estrutura esperada do formulário de registro.
 */
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
    // Telefone é opcional; se informado, deve possuir 10 (fixo) ou 11 (celular) dígitos
    telefone: z.string().optional().refine(
        (val) => {
            if (!val || val.trim() === '') return true; // permite vazio
            const numbers = removeNonNumeric(val); // remove caracteres não numéricos (parênteses, espaço, traço)
            return numbers.length === 10 || numbers.length === 11; // 10 para telefones fixos; 11 para celulares (com DDD)
        },
        { message: 'Telefone inválido' }
    ),
    tipo: z.enum(['buyer', 'provider', 'advertiser']),
});

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
    ALLOWED_TYPES: readonly ['image/jpeg', 'image/png', 'video/mp4'];
};

/**
 * Configuração padrão de mídia para a criação de ofertas.
 *
 * Atualizações recentes:
 * - Duração máxima de vídeo aumentada para 20 segundos.
 * - Tamanho máximo de arquivo aumentado para 100MB para suportar vídeos maiores.
 */
export const OFERTA_MEDIA_CONFIG: MediaConfig = {
    MAX_FILES: 5,
    MAX_SIZE: 100 * 1024 * 1024, // 100MB (aumentado para suportar vídeos de 20s)
    MAX_VIDEO_DURATION: 20, // ALTERADO: de 15 para 20 segundos
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'video/mp4'] as const,
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
    type: z.enum(OFERTA_MEDIA_CONFIG.ALLOWED_TYPES),
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
    cidade: z.string().min(1, MESSAGES.VALIDATION.REQUIRED),
    estado: z.string().min(2, 'UF inválida').max(2, 'Use UF, ex: SP'),
    mediaFiles: z
        .array(mediaFileSchema)
        .max(OFERTA_MEDIA_CONFIG.MAX_FILES, `Máximo ${OFERTA_MEDIA_CONFIG.MAX_FILES} arquivos`) // limita a quantidade de arquivos anexados
        .default([]),
});

/** Tipo inferido do schema de login. Útil para tipar formulários e handlers. */
export type LoginFormData = z.infer<typeof loginSchema>;
/** Tipo inferido do schema de registro. */
export type RegisterFormData = z.infer<typeof registerSchema>;
/** Tipo inferido para um arquivo de mídia individual. */
export type MediaFile = z.infer<typeof mediaFileSchema>;
/** Tipo inferido do schema de criação de oferta. */
export type CriarOfertaForm = z.infer<typeof criarOfertaSchema>;
