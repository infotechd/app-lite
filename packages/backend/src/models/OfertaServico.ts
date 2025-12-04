import mongoose, { Document, Schema } from 'mongoose';

export interface IOfertaServico extends Document {
    titulo: string;
    descricao: string;
    preco: number;
    unidadePreco: 'hora' | 'diaria' | 'mes' | 'aula' | 'pacote';
    categoria: string;
    subcategoria?: string;
    prestador: {
        _id: mongoose.Types.ObjectId;
        nome: string;
        avatar?: string;
        avaliacao: number;
        tipoPessoa: 'PF' | 'PJ';
    };
    // Suporta dados legados que podem estar como string[] no banco em versões antigas
    imagens: Array<string | { url: string; blurhash?: string }>;
    videos?: string[]; // Array de URLs dos vídeos no GridFS
    localizacao: {
        cidade: string;
        estado: string;
        endereco?: string;
        coordenadas?: {
            latitude: number;
            longitude: number;
        };
        // GeoJSON point para operações geoespaciais ($geoNear)
        location?: {
            type: 'Point';
            coordinates: [number, number]; // [longitude, latitude]
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

    unidadePreco: {
        type: String,
        enum: ['hora','diaria','mes','aula','pacote'],
        default: 'pacote',
        required: true,
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

    subcategoria: {
        type: String,
        trim: true,
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
        },
        tipoPessoa: {
            type: String,
            enum: ['PF', 'PJ'],
            default: 'PF'
        }
    },

    // ⚠️ IMPORTANTE: Array de URLs das imagens armazenadas no GridFS
    imagens: [{
        url: {
            type: String, // URL: /api/upload/file/{fileId}
            required: true,
            validate: {
                validator: function(url: string) {
                    return url.startsWith('/api/upload/file/') || url.startsWith('http');
                },
                message: 'URL de imagem inválida'
            }
        },
        blurhash: {
            type: String,
            trim: true
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
        },
        // Campo GeoJSON para suportar ordenação por distância via $geoNear
        location: {
            type: {
                type: String,
                enum: ['Point'],
                // Não definir default aqui para evitar criar { type: 'Point' } sem coordinates
                required: false
            },
            coordinates: {
                type: [Number],
                validate: {
                    validator: function(val: number[]) {
                        if (!Array.isArray(val) || val.length !== 2) return false;
                        const [lng, lat] = val;
                        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
                    },
                    message: 'Coordenadas inválidas. Use [lng, lat]'
                },
                // deixar opcional; será preenchido por middleware quando coordenadas existirem
                required: false,
                default: undefined
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
OfertaServicoSchema.index({ categoria: 1, subcategoria: 1, status: 1 });
OfertaServicoSchema.index({ 'localizacao.cidade': 1, 'localizacao.estado': 1 });
OfertaServicoSchema.index({ preco: 1 });
OfertaServicoSchema.index({ createdAt: -1 });
OfertaServicoSchema.index({ 'prestador._id': 1 });
OfertaServicoSchema.index({ 'prestador.tipoPessoa': 1 });
// Índice geoespacial para ordenação por distância
OfertaServicoSchema.index({ 'localizacao.location': '2dsphere' });
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
// Suporta itens como objetos { url, blurhash } e também strings legadas
OfertaServicoSchema.virtual('imagensCompletas').get(function(this: any) {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const imagens = (this?.imagens || []) as Array<string | { url: string; blurhash?: string }>;

    return imagens.map((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (!url) return url as any;
        return url.startsWith('http') ? url : `${baseUrl}${url}`;
    });
});

// Middleware para popular dados do prestador
OfertaServicoSchema.pre('find', function() {
    this.populate('prestador._id', 'nome avatar');
});

OfertaServicoSchema.pre('findOne', function() {
    this.populate('prestador._id', 'nome avatar');
});

// Middleware para manter o campo GeoJSON em sincronia com as coordenadas escalares
OfertaServicoSchema.pre('save', function(next) {
    try {
        const loc: any = (this as any).localizacao;
        const lat = loc?.coordenadas?.latitude;
        const lng = loc?.coordenadas?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
            (this as any).localizacao = {
                ...(loc || {}),
                location: { type: 'Point', coordinates: [lng, lat] }
            };
        } else if (loc && loc.location) {
            // Remover location inconsistente (ex.: { type: 'Point' } sem coordinates)
            const { location, ...rest } = loc;
            (this as any).localizacao = { ...rest };
        }
        next();
    } catch (e) {
        next(e as any);
    }
});

// Também ajustar em updates via findOneAndUpdate
OfertaServicoSchema.pre('findOneAndUpdate', function(next) {
    try {
        const update: any = this.getUpdate() || {};
        const loc = update['localizacao'] || update.$set?.['localizacao'];
        const coords = loc?.coordenadas;
        if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
            const newLoc = {
                ...(loc || {}),
                location: { type: 'Point', coordinates: [coords.longitude, coords.latitude] }
            };
            if (update.$set && update.$set['localizacao']) {
                update.$set['localizacao'] = newLoc;
            } else {
                update['localizacao'] = newLoc;
            }
            this.setUpdate(update);
        } else if (loc && loc.location && (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number')) {
            // Se vier um location inválido sem coordenadas válidas, removê-lo para evitar erro de índice
            const { location, ...rest } = loc;
            if (update.$set && update.$set['localizacao']) {
                update.$set['localizacao'] = rest;
            } else {
                update['localizacao'] = rest;
            }
            this.setUpdate(update);
        }
        next();
    } catch (e) {
        next(e as any);
    }
});

export const OfertaServico = mongoose.model<IOfertaServico>('OfertaServico', OfertaServicoSchema);