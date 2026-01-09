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

/**
 * Validação para atualização de localização do usuário autenticado.
 */
export const updateLocationSchema = z.object({
  body: z.object({
    cidade: z.string()
      .trim()
      .min(2, 'Cidade deve ter no mínimo 2 caracteres')
      .max(50, 'Cidade deve ter no máximo 50 caracteres'),
    estado: z.string()
      .trim()
      .length(2, 'Estado deve ser a sigla com 2 caracteres (ex: SP)')
      .transform((val) => val.toUpperCase()),
  }),
});

/**
 * Validação para atualização de e-mail do usuário autenticado.
 * - Garante trim, formato de e-mail válido e senha atual.
 */
export const updateEmailSchema = z.object({
  body: z.object({
    email: z.string()
      .trim()
      .toLowerCase()
      .email('E-mail inválido'),
    currentPassword: z.string()
      .min(6, 'Senha atual é obrigatória e deve ter no mínimo 6 caracteres'),
  }),
});

/**
 * Validação para atualização de documentos do usuário autenticado.
 * - Permite atualização de CPF ou CNPJ, mas não ambos.
 */
export const updateDocumentsSchema = z.object({
  body: z.object({
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos').optional(),
    cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos').optional(),
  }).refine((data) => data.cpf || data.cnpj, { message: 'CPF ou CNPJ deve ser informado' }),
});

/**
 * Validação para atualização de dados da empresa do usuário autenticado.
 */
export const updateCompanyDataSchema = z.object({
  body: z.object({
    razaoSocial: z.string().trim().min(3, 'Razão Social deve ter no mínimo 3 caracteres'),
    nomeFantasia: z.string().trim().optional(),
  }),
});

export type UpdateNameInput = z.infer<typeof updateNameSchema>['body'];
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>['body'];
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>['body'];
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>['body'];
export type UpdateDocumentsInput = z.infer<typeof updateDocumentsSchema>['body'];
export type UpdateCompanyDataInput = z.infer<typeof updateCompanyDataSchema>['body'];
