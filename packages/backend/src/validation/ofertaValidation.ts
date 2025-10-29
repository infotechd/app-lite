import { z } from 'zod';

// Função auxiliar para capitalizar a primeira letra, deixar o resto em minúsculo E remover acentos
const capitalizeAndNormalize = (s: string | undefined): string | undefined => {
    if (!s) return s;
    // 1. Remove acentos (normalização)
    const normalized = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // 2. Capitaliza a primeira letra e deixa o resto em minúsculo
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

// --- INÍCIO DA CORREÇÃO ---
// 1. Definir as opções de sort e tipoPessoa permitidas (baseado no seu frontend)
const SORT_OPTIONS = [
    'relevancia',
    'preco_menor',
    'preco_maior',
    'avaliacao',
    'recente'
] as const;

const TIPO_PESSOA_OPTIONS = ['PF', 'PJ'] as const;
// --- FIM DA CORREÇÃO ---

// Filtros para listagem de ofertas
export const ofertaFiltersSchema = z.object({
    query: z.object({
        categoria: z.string().min(1).max(50).optional(),
        precoMin: z.coerce.number().min(0).optional(),
        precoMax: z.coerce.number().min(0).optional(),
        cidade: z.string().min(1).max(100).optional(),
        estado: z.string().min(2).max(2).optional(),
        busca: z.string().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),

        // --- INÍCIO DA CORREÇÃO ---
        // 2. Adicionar os campos que faltavam para que o validador não os remova:

        // z.enum() garante que só os valores da lista serão aceitos.
        sort: z.enum(SORT_OPTIONS).optional(),

        // z.coerce.boolean() converte a string "true" (da query param) para o boolean 'true'.
        comMidia: z.coerce.boolean().optional(),

        tipoPessoa: z.enum(TIPO_PESSOA_OPTIONS).optional(),
        // --- FIM DA CORREÇÃO ---
    })
});

// Schema base de localização
const localizacaoBase = z.object({
    cidade: z.string().min(1, 'Cidade é obrigatória').max(100),
    estado: z.string().length(2, 'Estado deve ter 2 letras'),
    endereco: z.string().max(200).optional(),
    coordenadas: z.object({
        latitude: z.number(),
        longitude: z.number()
    }).optional()
});

const midiasSuperRefine = (data: unknown, ctx: z.RefinementCtx) => {
    const d: any = data as any;
    const imagensCount = Array.isArray(d?.imagens) ? d.imagens.length : 0;
    const videosCount = Array.isArray(d?.videos) ? d.videos.length : 0;
    if (imagensCount + videosCount > 3) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['videos'],
            message: 'Máximo de 3 mídias no total (imagens + vídeos)'
        });
    }
};

// CATEGORIAS SEM ACENTO PARA VALIDAÇÃO NO BACKEND
const CATEGORIAS_VALIDAS = [
    'Tecnologia', 'Saude', 'Educacao', 'Beleza', 'Limpeza', 'Consultoria', 'Construcao', 'Jardinagem', 'Transporte', 'Alimentacao', 'Eventos', 'Outros'
] as const;


// Create oferta
export const createOfertaSchema = z.object({
    body: z.object({
        titulo: z.string().min(3).max(100),
        descricao: z.string().min(10).max(1000),
        preco: z.number().nonnegative(),
        // CORREÇÃO DEFINITIVA DE CATEGORIA: Normaliza, capitaliza e valida contra enum sem acento
        categoria: z.string()
            .transform(s => s ? s.toLowerCase() : s)
            .transform(capitalizeAndNormalize)
            .pipe(z.enum(CATEGORIAS_VALIDAS)),
        imagens: z.array(z.string().url().or(z.string().startsWith('/api/upload/file/'))).max(3).optional().default([]),
        videos: z.array(z.string().url().or(z.string().startsWith('/api/upload/file/'))).max(3).optional().default([]),
        localizacao: localizacaoBase,
        tags: z.array(z.string().min(1).max(30)).max(10).optional(),
        disponibilidade: z.object({
            diasSemana: z.array(z.string()).max(7).optional().default([]),
            horarioInicio: z.string().optional(),
            horarioFim: z.string().optional(),
        }).optional(),
    }).superRefine(midiasSuperRefine)
});

// Update oferta (todos os campos opcionais)
export const updateOfertaSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        titulo: z.string().min(3).max(100).optional(),
        descricao: z.string().min(10).max(1000).optional(),
        preco: z.number().nonnegative().optional(),
        // CORREÇÃO DEFINITIVA DE CATEGORIA: Normaliza, capitaliza e valida contra enum sem acento
        categoria: z.string().optional()
            .transform(s => s ? s.toLowerCase() : s)
            .transform(capitalizeAndNormalize)
            .pipe(z.enum(CATEGORIAS_VALIDAS)).optional(),
        imagens: z.array(z.string().url().or(z.string().startsWith('/api/upload/file/'))).max(3).optional().default([]),
        videos: z.array(z.string().url().or(z.string().startsWith('/api/upload/file/'))).max(3).optional().default([]),
        localizacao: localizacaoBase.optional(),
        tags: z.array(z.string().min(1).max(30)).max(10).optional(),
        disponibilidade: z.object({
            diasSemana: z.array(z.string()).max(7).optional(),
            horarioInicio: z.string().optional(),
            horarioFim: z.string().optional(),
        }).optional(),
        status: z.enum(['ativo','inativo','pausado']).optional(),
    }).superRefine(midiasSuperRefine)
});

export type OfertaFiltersInput = z.infer<typeof ofertaFiltersSchema>["query"];
export type CreateOfertaInput = z.infer<typeof createOfertaSchema>["body"];
export type UpdateOfertaInput = z.infer<typeof updateOfertaSchema>["body"];
