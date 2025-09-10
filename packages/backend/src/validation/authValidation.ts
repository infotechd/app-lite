import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        nome: z.string()
            .min(2, 'Nome deve ter no mínimo 2 caracteres')
            .max(100, 'Nome deve ter no máximo 100 caracteres')
            .trim(),
        email: z.string()
            .email('Email inválido')
            .toLowerCase()
            .trim(),
        senha: z.string()
            .min(6, 'Senha deve ter no mínimo 6 caracteres')
            .max(100, 'Senha deve ter no máximo 100 caracteres'),
        telefone: z.string()
            .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido. Use formato: (11) 99999-9999')
            .optional(),
        tipo: z.enum(['comprador', 'prestador', 'anunciante', 'buyer', 'provider', 'advertiser'])
            .transform((v) => {
                switch (v) {
                    case 'buyer':
                        return 'comprador';
                    case 'provider':
                        return 'prestador';
                    case 'advertiser':
                        return 'anunciante';
                    default:
                        return v;
                }
            })
            .default('comprador')
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Email inválido')
            .toLowerCase()
            .trim(),
        senha: z.string()
            .min(1, 'Senha é obrigatória')
    })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];