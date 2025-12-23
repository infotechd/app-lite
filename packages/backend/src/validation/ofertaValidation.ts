import { z } from 'zod';

// 1) Opções permitidas
const SORT_OPTIONS = [
    'relevancia',
    'preco_menor',
    'preco_maior',
    'avaliacao',
    'recente',
    'distancia'
] as const;

const TIPO_PESSOA_OPTIONS = ['PF', 'PJ'] as const;

// 2) Filtros para listagem de ofertas
export const ofertaFiltersSchema = z.object({
    query: z.object({
        categoria: z.string().min(1).max(50).optional(),
        subcategoria: z.string().min(1).max(100).optional(),
        precoMin: z.coerce.number().min(0).optional(),
        precoMax: z.coerce.number().min(0).optional(),
        cidade: z.string().min(1).max(100).optional(),
        estado: z.string().min(2).max(2).transform((v) => v.toUpperCase()).optional(),
        busca: z.string().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
        sort: z.enum(SORT_OPTIONS).optional(),
        // z.coerce.boolean() converte a string "true" (da query param) para o boolean 'true'.
        comMidia: z.coerce.boolean().optional(),
        tipoPessoa: z.enum(TIPO_PESSOA_OPTIONS).optional(),
        // Coordenadas para ordenação por distância
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
    }).superRefine((q, ctx) => {
        // Validação: precoMin não pode ser maior que precoMax
        if (typeof q.precoMin === 'number' && typeof q.precoMax === 'number' && q.precoMin > q.precoMax) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['precoMin'],
                message: 'precoMin não pode ser maior que precoMax'
            });
        }
        // Validação: para sort=distancia, lat e lng são obrigatórios
        if (q.sort === 'distancia') {
            if (typeof q.lat !== 'number' || typeof q.lng !== 'number') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['lat'],
                    message: 'lat e lng são obrigatórios quando sort=distancia'
                });
            }
        }
    })
});

// Schema base de localização
const localizacaoBase = z.object({
    cidade: z.string().max(100),
    estado: z.string().length(2, 'Estado deve ter 2 letras'),
    endereco: z.string().max(200).optional(),
    coordenadas: z.object({
        latitude: z.number(),
        longitude: z.number()
    }).optional()
}).refine((data) => {
    // Cidade só é obrigatória se o estado não for 'BR' (Brasil)
    if (data.estado !== 'BR') {
        return data.cidade.trim().length > 0;
    }
    return true;
}, {
    message: 'Cidade é obrigatória',
    path: ['cidade']
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

// CATEGORIAS COM ACENTO (alinhadas ao Schema/Mongo)
const CATEGORIAS_VALIDAS = [
    'Tecnologia', 'Saúde', 'Educação', 'Beleza', 'Limpeza', 'Consultoria', 'Construção', 'Jardinagem', 'Transporte', 'Alimentação', 'Eventos', 'Outros'
] as const;

// Aceitar tanto nomes canônicos quanto slugs/variantes sem acento enviados pelo app
const removeDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const CATEGORIA_SLUG_TO_NAME: Record<string, typeof CATEGORIAS_VALIDAS[number]> = {
    tecnologia: 'Tecnologia',
    saude: 'Saúde',
    educacao: 'Educação',
    beleza: 'Beleza',
    limpeza: 'Limpeza',
    consultoria: 'Consultoria',
    construcao: 'Construção',
    jardinagem: 'Jardinagem',
    transporte: 'Transporte',
    alimentacao: 'Alimentação',
    eventos: 'Eventos',
    outros: 'Outros',
};

// Normaliza quaisquer entradas (slug, sem acento, maiúsculas/minúsculas) para o nome canônico
const normalizeCategoria = (input: string | undefined) => {
    if (!input) return input;
    const trimmed = String(input).trim();
    if (!trimmed) return trimmed;
    const base = removeDiacritics(trimmed).toLowerCase();
    // 1) Mapeamento direto via slug conhecido
    if (CATEGORIA_SLUG_TO_NAME[base as keyof typeof CATEGORIA_SLUG_TO_NAME]) {
        return CATEGORIA_SLUG_TO_NAME[base as keyof typeof CATEGORIA_SLUG_TO_NAME];
    }
    // 2) Tentar casar com alguma categoria válida ignorando acentos/case
    const match = (CATEGORIAS_VALIDAS as readonly string[]).find((c) => removeDiacritics(c).toLowerCase() === base);
    return (match as any) || trimmed;
};

// Create oferta
const PRICE_UNITS = ['hora','diaria','mes','aula','pacote'] as const;
export const createOfertaSchema = z.object({
    body: z.object({
        titulo: z.string().min(3).max(100),
        descricao: z.string().min(10).max(1000),
        preco: z.number().nonnegative(),
        unidadePreco: z.enum(PRICE_UNITS),
        // Aceita slug (ex.: "construcao") ou nome ("Construção"). Sempre persiste nome canônico.
        categoria: z.string()
            .transform((s) => normalizeCategoria(s))
            .pipe(z.enum(CATEGORIAS_VALIDAS)),
        subcategoria: z.string().trim().max(100).optional(),
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
        unidadePreco: z.enum(PRICE_UNITS).optional(),
        // Aceita slug ou nome; normaliza para nome canônico
        categoria: z.string().optional()
            .transform((s) => normalizeCategoria(s))
            .pipe(z.enum(CATEGORIAS_VALIDAS)).optional(),
        subcategoria: z.string().trim().max(100).optional(),
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
