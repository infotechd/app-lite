import mongoose, { Document, Schema } from 'mongoose';

export interface IOfertaServico extends Document {
    titulo: string;
    descricao: string;
    preco: number;
    categoria: string;
    prestador: {
        _id: mongoose.Types.ObjectId;
        nome: string;
        avatar?: string;
        avaliacao: number;
    };
    imagens: string[]; // ⚠️ IMPORTANTE: Array de URLs das imagens no GridFS
    videos?: string[]; // Array de URLs dos vídeos no GridFS
    localizacao: {
        cidade: string;
        estado: string;
        endereco?: string;
        coordenadas?: {
            latitude: number;
            longitude: number;
        };
    };
    status: 'ativo' | 'inativo' | 'pausado';
    visualizacoes: number;
    favoritado: number;
    tags: string[];
    disponibilidade: {
        diasSemana: string[];
        horarioInicio: string;
        horarioFim: string;
    };
    avaliacoes: {
        media: number;
        total: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const OfertaServicoSchema = new Schema<IOfertaServico>({
    titulo: {
        type: String,
        required: [true, 'Título é obrigatório'],
        trim: true,
        maxlength: [100, 'Título deve ter no máximo 100 caracteres']
    },

    descricao: {
        type: String,
        required: [true, 'Descrição é obrigatória'],
        trim: true,
        maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres']
    },

    preco: {
        type: Number,
        required: [true, 'Preço é obrigatório'],
        min: [0, 'Preço deve ser maior que zero']
    },

    categoria: {
        type: String,
        required: [true, 'Categoria é obrigatória'],
        enum: {
            values: [
                'Tecnologia',
                'Saúde',
                'Educação',
                'Beleza',
                'Limpeza',
                'Consultoria',
                'Construção',
                'Jardinagem',
                'Transporte',
                'Alimentação',
                'Eventos',
                'Outros'
            ],
            message: 'Categoria inválida'
        }
    },

    prestador: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        nome: {
            type: String,
            required: true
        },
        avatar: String,
        avaliacao: {
            type: Number,
            default: 5.0,
            min: 0,
            max: 5
        }
    },

    // ⚠️ IMPORTANTE: Array de URLs das imagens armazenadas no GridFS
    imagens: [{
        type: String, // URL: /api/upload/file/{fileId}
        validate: {
            validator: function(url: string) {
                return url.startsWith('/api/upload/file/') || url.startsWith('http');
            },
            message: 'URL de imagem inválida'
        }
    }],

    videos: [{
        type: String, // URL: /api/upload/file/{fileId}
        validate: {
            validator: function(url: string) {
                return url.startsWith('/api/upload/file/') || url.startsWith('http');
            },
            message: 'URL de vídeo inválida'
        }
    }],

    localizacao: {
        cidade: {
            type: String,
            required: [true, 'Cidade é obrigatória'],
            trim: true
        },
        estado: {
            type: String,
            required: [true, 'Estado é obrigatório'],
            trim: true,
            maxlength: [2, 'Estado deve ter 2 caracteres'],
            uppercase: true
        },
        endereco: {
            type: String,
            trim: true
        },
        coordenadas: {
            latitude: {
                type: Number,
                min: -90,
                max: 90
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180
            }
        }
    },

    status: {
        type: String,
        enum: ['ativo', 'inativo', 'pausado'],
        default: 'ativo'
    },

    visualizacoes: {
        type: Number,
        default: 0,
        min: 0
    },

    favoritado: {
        type: Number,
        default: 0,
        min: 0
    },

    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    disponibilidade: {
        diasSemana: [{
            type: String,
            enum: ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
        }],
        horarioInicio: {
            type: String,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        },
        horarioFim: {
            type: String,
            match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        }
    },

    avaliacoes: {
        media: {
            type: Number,
            default: 5.0,
            min: 0,
            max: 5
        },
        total: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices para busca otimizada
OfertaServicoSchema.index({ categoria: 1, status: 1 });
OfertaServicoSchema.index({ 'localizacao.cidade': 1, 'localizacao.estado': 1 });
OfertaServicoSchema.index({ preco: 1 });
OfertaServicoSchema.index({ createdAt: -1 });
OfertaServicoSchema.index({ 'prestador._id': 1 });
OfertaServicoSchema.index({
    titulo: 'text',
    descricao: 'text',
    tags: 'text'
}, {
    weights: {
        titulo: 10,
        descricao: 5,
        tags: 1
    }
});

// Virtual para URL completa das imagens
OfertaServicoSchema.virtual('imagensCompletas').get(function() {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    return this.imagens.map((img: string) => {
        if (img.startsWith('http')) return img;
        return `${baseUrl}${img}`;
    });
});

// Middleware para popular dados do prestador
OfertaServicoSchema.pre('find', function() {
    this.populate('prestador._id', 'nome avatar');
});

OfertaServicoSchema.pre('findOne', function() {
    this.populate('prestador._id', 'nome avatar');
});

export const OfertaServico = mongoose.model<IOfertaServico>('OfertaServico', OfertaServicoSchema);