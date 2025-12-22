import { z } from 'zod';

/**
 * Validação para atualização de nome do usuário autenticado.
 * - Garante trim, mínimo e máximo de caracteres.
 * - Reduz múltiplos espaços internos.
 */
export const updateNameSchema = z.object({
  body: z.object({
    nome: z.string()
      .trim()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(50, 'Nome deve ter no máximo 50 caracteres')
      .refine((val) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(val), {
        message: 'Nome deve conter apenas letras e espaços'
      })
      .transform((value) => value.replace(/\s+/g, ' ').trim()),
  }),
});

export type UpdateNameInput = z.infer<typeof updateNameSchema>['body'];
