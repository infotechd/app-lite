/**
 * Esquema de validação para os dados de autenticação utilizando a biblioteca Zod.
 * Este arquivo define como os dados que chegam da API devem ser estruturados e validados,
 * além de realizar transformações para garantir compatibilidade entre o Frontend e o Modelo do Banco de Dados.
 */

import { z } from 'zod';
import { validateCPF } from '../utils/validation';

/** Expressão regular para validação de telefone no formato brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

/**
 * Schema base contendo campos comuns a todos os tipos de usuário (PF e PJ).
 */
const commonSchema = z.object({
    email: z.string()
        .email('Email inválido')
        .toLowerCase()
        .trim(),
    // O frontend envia o campo como 'password', mas o banco utiliza 'senha'
    password: z.string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres')
        .trim(),
    telefone: z.string()
        .regex(phoneRegex, 'Telefone inválido. Use formato: (11) 99999-9999')
        .optional()
        .or(z.literal('')), // Permite que o campo seja uma string vazia caso não informado
    // Tipos de perfil aceitos, suportando tanto termos em português quanto em inglês
    tipo: z.enum(['comprador', 'prestador', 'anunciante', 'buyer', 'provider', 'advertiser']),
});

/**
 * Schema específico para validação de Pessoa Física (PF).
 * Estende o commonSchema e exige campos como nome e CPF.
 */
const pfSchema = commonSchema.extend({
    tipoPessoa: z.literal('PF'),
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').trim(),
    cpf: z.string().refine(
        (val) => validateCPF(val),
        'CPF inválido'
    ),
    // Define campos de PJ como opcionais para evitar erros de validação caso venham vazios do formulário
    razaoSocial: z.string().optional(),
    cnpj: z.string().optional(),
    nomeFantasia: z.string().optional(),
});

/**
 * Schema específico para validação de Pessoa Jurídica (PJ).
 * Estende o commonSchema e exige campos como razão social e CNPJ.
 */
const pjSchema = commonSchema.extend({
    tipoPessoa: z.literal('PJ'),
    razaoSocial: z.string().min(2, 'Razão social é obrigatória').trim(),
    cnpj: z.string().refine(
        (val) => val.replace(/\D/g, '').length === 14,
        'CNPJ deve ter 14 dígitos'
    ),
    nomeFantasia: z.string().optional(),
    // Define campos de PF como opcionais
    nome: z.string().optional(),
    cpf: z.string().optional(),
});

/**
 * União discriminada que decide qual schema usar baseado no campo 'tipoPessoa'.
 * Isso permite validações condicionais robustas para o formulário de registro.
 */
const registerBodySchema = z.discriminatedUnion("tipoPessoa", [
    pfSchema,
    pjSchema,
]);

/**
 * Schema de Registro principal.
 * Inclui uma transformação (.transform) que prepara os dados validados para o authController,
 * mapeando campos do frontend para os campos esperados pelo modelo User do Mongoose.
 */
export const registerSchema = z.object({
    body: registerBodySchema.transform((data) => {
        const { password, tipo, ...rest } = data;

        // 1. Mapeia 'password' do frontend para 'senha' do backend
        const transformedData: any = { ...rest, senha: password };

        // 2. Normaliza o 'tipo' para o padrão em português salvo no banco
        switch (tipo) {
            case 'buyer': transformedData.tipo = 'comprador'; break;
            case 'provider': transformedData.tipo = 'prestador'; break;
            case 'advertiser': transformedData.tipo = 'anunciante'; break;
            default: transformedData.tipo = tipo;
        }

        // 3. Em caso de PJ, utiliza a 'razaoSocial' como o campo 'nome' principal do usuário
        if (data.tipoPessoa === 'PJ') {
            transformedData.nome = data.razaoSocial;
        }

        // 4. Remove formatação (pontos, traços) de CPF e CNPJ
        if (transformedData.cpf) {
            transformedData.cpf = transformedData.cpf.replace(/\D/g, '');
        }
        if (transformedData.cnpj) {
            transformedData.cnpj = transformedData.cnpj.replace(/\D/g, '');
        }

        return transformedData;
    }),
});

/**
 * Schema para validação de Login.
 * Realiza o mapeamento de 'password' para 'senha' após a validação inicial.
 */
export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Email inválido')
            .toLowerCase()
            .trim(),
        password: z.string()
            .min(1, 'Senha é obrigatória')
            .trim()
    })
        .transform(data => ({
            email: data.email,
            senha: data.password
        })),
});

/**
 * Schema para solicitação de recuperação de senha (apenas e-mail).
 */
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('Email inválido').trim().toLowerCase(),
    }),
});

/**
 * Schema para redefinição de senha utilizando o token recebido.
 * Mapeia o campo 'password' para 'senha'.
 */
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(10, 'Token inválido'),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').trim(),
    }).transform(data => ({
        token: data.token,
        senha: data.password,
    })),
});

/** Tipagem inferida para os dados de Registro após a transformação */
export type RegisterInput = z.infer<typeof registerSchema>['body'];
/** Tipagem inferida para os dados de Login após a transformação */
export type LoginInput = z.infer<typeof loginSchema>['body'];
/** Tipagem inferida para os dados de Recuperação de Senha */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
/** Tipagem inferida para os dados de Redefinição de Senha após a transformação */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
