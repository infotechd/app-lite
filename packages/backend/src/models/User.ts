import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    tipo: 'comprador' | 'prestador' | 'anunciante';
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
    tipo: {
        type: String,
        enum: {
            values: ['comprador', 'prestador', 'anunciante'],
            message: 'Tipo deve ser: comprador, prestador ou anunciante'
        },
        default: 'comprador'
    },
    ativo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tipo: 1 });
UserSchema.index({ ativo: 1 });

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