export interface OfertaServico {
    _id: string;
    titulo: string;
    descricao: string;
    preco: number;
    categoria: string;
    prestador: {
        _id: string;
        nome: string;
        avatar?: string;
        avaliacao: number;
    };
    imagens: string[]; // IMPORTANTE: é 'imagens', não 'imagem'
    videos?: string[]; // URLs de vídeos (MP4) no GridFS
    localizacao: {
        cidade: string;
        estado: string;
        endereco?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateOfertaInput {
    titulo: string;
    descricao: string;
    preco: number;
    categoria: string;
    imagens?: string[];
    videos?: string[];
    localizacao: {
        cidade: string;
        estado: string;
        endereco?: string;
    };
}

export interface OfertaFilters {
    categoria?: string;
    precoMin?: number;
    precoMax?: number;
    cidade?: string;
    estado?: string;
    busca?: string;
}