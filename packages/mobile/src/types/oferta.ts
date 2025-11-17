import type { PriceUnit } from '@/utils/validation';

export interface OfertaServico {
    _id: string;
    titulo: string;
    descricao: string;
    preco: number;
    unidadePreco?: PriceUnit; // NOVO: unidade do preço
    categoria: string;
    subcategoria?: string; // alinhado ao backend
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
    // Distância em metros quando ordenado por distância (opcional)
    distancia?: number;
    createdAt: string;
    updatedAt: string;
}

export type SortOption = 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente' | 'distancia';

export interface CreateOfertaInput {
    titulo: string;
    descricao: string;
    preco: number;
    unidadePreco: PriceUnit; // NOVO: obrigatório no create
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
    subcategoria?: string;
    precoMin?: number;
    precoMax?: number;
    cidade?: string;
    estado?: string;
    busca?: string;
    // Novos filtros avançados (opcionais)
    sort?: SortOption;
    comMidia?: boolean;
    tipoPessoa?: 'PF' | 'PJ';
    // Coordenadas para sort por distância
    lat?: number;
    lng?: number;
}