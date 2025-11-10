import { z } from 'zod';

// Regex para validar telefone (formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

// --- Schema Base Comum ---
// Define os campos que são comuns a PF e PJ
const commonSchema = z.object({
    email: z.string()
        .email('Email inválido')
        .toLowerCase()
        .trim(),
    // O frontend envia 'password'
    password: z.string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres'),
    telefone: z.string()
        .regex(phoneRegex, 'Telefone inválido. Use formato: (11) 99999-9999')
        .optional()
        .or(z.literal('')), // Aceita opcional ou string vazia

    // O frontend envia 'buyer', 'provider', 'advertiser'
    tipo: z.enum(['comprador', 'prestador', 'anunciante', 'buyer', 'provider', 'advertiser']),
});

// --- Schema PF ---
// Define os campos específicos para Pessoa Física
const pfSchema = commonSchema.extend({
    tipoPessoa: z.literal('PF'),
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').trim(),
    cpf: z.string().refine(
        (val) => val.replace(/\D/g, '').length === 11,
        'CPF deve ter 11 dígitos'
    ),
    // Campos de PJ não são esperados (mas podem vir vazios do form)
    razaoSocial: z.string().optional(),
    cnpj: z.string().optional(),
    nomeFantasia: z.string().optional(),
});

// --- Schema PJ ---
// Define os campos específicos para Pessoa Jurídica
const pjSchema = commonSchema.extend({
    tipoPessoa: z.literal('PJ'),
    razaoSocial: z.string().min(2, 'Razão social é obrigatória').trim(),
    cnpj: z.string().refine(
        (val) => val.replace(/\D/g, '').length === 14,
        'CNPJ deve ter 14 dígitos'
    ),
    nomeFantasia: z.string().optional(),
    // Campos de PF não são esperados
    nome: z.string().optional(),
    cpf: z.string().optional(),
});

// --- União Discriminada ---
// ✅ ESTA É A CORREÇÃO PRINCIPAL
// O Zod irá olhar para o campo 'tipoPessoa' e decidir automaticamente
// se deve usar o 'pfSchema' ou o 'pjSchema'.
const registerBodySchema = z.discriminatedUnion("tipoPessoa", [
    pfSchema,
    pjSchema,
]);

// --- Schema Final com Transformações ---
// Transforma os dados do frontend (ex: 'password') para o formato
// que o Controller/Model esperam (ex: 'senha')
export const registerSchema = z.object({
    body: registerBodySchema.transform((data) => {
        // 'data' aqui já foi validado como PF ou PJ
        const { password, tipo, ...rest } = data;

        // 1. Mapeia 'password' -> 'senha'
        const transformedData: any = { ...rest, senha: password };

        // 2. Mapeia 'tipo' (buyer -> comprador)
        switch (tipo) {
            case 'buyer': transformedData.tipo = 'comprador'; break;
            case 'provider': transformedData.tipo = 'prestador'; break;
            case 'advertiser': transformedData.tipo = 'anunciante'; break;
            default: transformedData.tipo = tipo;
        }

        // 3. Mapeia 'razaoSocial' -> 'nome' (se for PJ)
        // (Isso é o que o Model User.ts espera)
        if (data.tipoPessoa === 'PJ') {
            transformedData.nome = data.razaoSocial;
        }

        // 4. (Opcional) Limpar formatação dos documentos
        if (transformedData.cpf) {
            transformedData.cpf = transformedData.cpf.replace(/\D/g, '');
        }
        if (transformedData.cnpj) {
            transformedData.cnpj = transformedData.cnpj.replace(/\D/g, '');
        }

        // Retorna o objeto limpo para o authController
        return transformedData;
    }),
});


// Schema de Login (ajustado para 'password' -> 'senha')
export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Email inválido')
            .toLowerCase()
            .trim(),
        // Frontend envia 'password'
        password: z.string()
            .min(1, 'Senha é obrigatória')
    })
        // Transforma para o que o controller espera
        .transform(data => ({
            email: data.email,
            senha: data.password
        })),
});

// Tipos inferidos (agora 100% corretos)
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];