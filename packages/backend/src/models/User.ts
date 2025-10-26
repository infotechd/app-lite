import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    avatar?: string;
    tipo: 'comprador' | 'prestador' | 'anunciante';

    // Novos campos PF/PJ
    tipoPessoa: 'PF' | 'PJ';
    cpf?: string; // Para PF
    cnpj?: string; // Para PJ
    razaoSocial?: string; // Para PJ
    nomeFantasia?: string; // Para PJ

    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    nome: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        minlength: [2, 'Nome deve ter no mínimo 2 caracteres'],
        maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
    },

    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },

    senha: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
        select: false
    },

    telefone: {
        type: String,
        trim: true,
        match: [/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido. Use formato: (11) 99999-9999']
    },

    avatar: {
        type: String,
        trim: true
    },

    tipo: {
        type: String,
        enum: {
            values: ['comprador', 'prestador', 'anunciante'],
            message: 'Tipo deve ser: comprador, prestador ou anunciante'
        },
        default: 'comprador'
    },

    // Novo campo: Tipo de Pessoa (PF/PJ)
    tipoPessoa: {
        type: String,
        enum: {
            values: ['PF', 'PJ'],
            message: 'Tipo de pessoa deve ser: PF (Pessoa Física) ou PJ (Pessoa Jurídica)'
        },
        default: 'PF'
    },

    // CPF (para Pessoa Física)
    cpf: {
        type: String,
        trim: true,
        sparse: true,
        validate: {
            validator: function(this: IUser, cpf: string | undefined) {
                if (this.tipoPessoa === 'PF' && !cpf) {
                    return false;
                }
                if (cpf) {
                    const cleanCpf = cpf.replace(/\D/g, '');
                    return cleanCpf.length === 11;
                }
                return true;
            },
            message: 'CPF inválido. Deve ter 11 dígitos.'
        }
    },

    // CNPJ (para Pessoa Jurídica)
    cnpj: {
        type: String,
        trim: true,
        sparse: true,
        validate: {
            validator: function(this: IUser, cnpj: string | undefined) {
                if (this.tipoPessoa === 'PJ' && !cnpj) {
                    return false;
                }
                if (cnpj) {
                    const cleanCnpj = cnpj.replace(/\D/g, '');
                    return cleanCnpj.length === 14;
                }
                return true;
            },
            message: 'CNPJ inválido. Deve ter 14 dígitos.'
        }
    },

    // Razão Social (para PJ)
    razaoSocial: {
        type: String,
        trim: true,
        validate: {
            validator: function(this: IUser, razaoSocial: string | undefined) {
                if (this.tipoPessoa === 'PJ' && !razaoSocial) {
                    return false;
                }
                return true;
            },
            message: 'Razão social é obrigatória para Pessoa Jurídica'
        }
    },

    // Nome Fantasia (para PJ, opcional)
    nomeFantasia: {
        type: String,
        trim: true,
    },

    ativo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices atualizados
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tipo: 1 });
UserSchema.index({ ativo: 1 });
UserSchema.index({ tipoPessoa: 1 });
UserSchema.index({ cpf: 1 }, { unique: true, sparse: true });
UserSchema.index({ cnpj: 1 }, { unique: true, sparse: true });

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
    if (!this.isModified('senha')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.senha = await bcrypt.hash(this.senha, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.senha);
};

export default mongoose.model<IUser>('User', UserSchema);