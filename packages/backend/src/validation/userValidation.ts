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

/**
 * Validação para atualização de telefone do usuário autenticado.
 * - Garante o formato (99) 99999-9999 ou (99) 9999-9999.
 */
export const updatePhoneSchema = z.object({
  body: z.object({
    telefone: z.string()
      .trim()
      .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido. Use o formato (11) 99999-9999'),
  }),
});

export type UpdateNameInput = z.infer<typeof updateNameSchema>['body'];
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>['body'];
