import { z } from 'zod';

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

// Create oferta
export const createOfertaSchema = z.object({
    body: z.object({
        titulo: z.string().min(3).max(100),
        descricao: z.string().min(10).max(1000),
        preco: z.number().nonnegative(),
        categoria: z.enum([
            'Tecnologia','Saúde','Educação','Beleza','Limpeza','Consultoria','Construção','Jardinagem','Transporte','Alimentação','Eventos','Outros'
        ]),
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
        categoria: z.enum([
            'Tecnologia','Saúde','Educação','Beleza','Limpeza','Consultoria','Construção','Jardinagem','Transporte','Alimentação','Eventos','Outros'
        ]).optional(),
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