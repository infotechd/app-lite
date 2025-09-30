import api from './api';
import { OfertaServico, CreateOfertaInput, OfertaFilters } from '@/types/oferta';
import { unwrapApiResponse } from '@/utils/api';

export interface OfertasResponse {
    ofertas: OfertaServico[];
    total: number;
    page: number;
    totalPages: number;
}

// Funções auxiliares para normalizar dados da API para tipos estritos
// TODO: Validar esquemas de resposta (ex.: Zod) antes do mapeamento para maior robustez
/**
 * Converte um valor para número de forma segura.
 * - Retorna 0 quando não for um número válido (NaN, Infinity ou valores não numéricos).
 * - Evita que operações numéricas quebrem por entradas malformadas.
 * Possível melhoria: usar biblioteca de precisão decimal (ex.: decimal.js) para valores monetários.
 */
function toNumberSafe(value: unknown): number {
    if (typeof value === 'number' && isFinite(value)) return value;
    const n = Number((value as any) ?? 0);
    return isFinite(n) ? n : 0;
}

/**
 * Transforma um objeto "cru" vindo da API em um OfertaServico tipado.
 * - Garante que imagens seja sempre um array e remove valores falsy.
 * - Converte o preço para número seguro.
 * - Inclui vídeos somente quando houver uma lista válida.
 * Possíveis melhorias: validar todos os campos esperados e normalizar ausentes para valores padrão explícitos.
 */
function mapOferta(raw: any): OfertaServico {
    const imagens = Array.isArray(raw?.imagens) ? raw.imagens.filter(Boolean) : [];
    const videos = Array.isArray(raw?.videos) ? raw.videos.filter(Boolean) : undefined;
    return {
        ...raw,
        preco: toNumberSafe(raw?.preco),
        imagens,
        ...(videos ? { videos } : {}),
    } as OfertaServico;
}

/**
 * Mapeia uma lista qualquer para uma lista de OfertaServico já normalizada.
 * - Retorna lista vazia quando a entrada não é um array.
 */
function mapOfertas(list: any): OfertaServico[] {
    return Array.isArray(list) ? list.map(mapOferta) : [];
}

/**
 * Serviço responsável por consumir a API de Ofertas.
 * Centraliza chamadas HTTP e normaliza respostas.
 * Possíveis melhorias: retries com backoff, timeouts e suporte a abortamento de requisições.
 */
export const ofertaService = {
    /**
     * Busca ofertas com filtros e paginação.
     * - Monta query string a partir dos filtros.
     * - Normaliza a resposta e aplica valores padrão seguros.
     * Possíveis melhorias: cache por filtros/página e suporte a cancelamento (AbortController).
     */
    async getOfertas(filters?: OfertaFilters, page = 1, limit = 10): Promise<OfertasResponse> {
        const params = new URLSearchParams();

        if (filters?.categoria) params.append('categoria', filters.categoria);
        if (filters?.precoMin) params.append('precoMin', filters.precoMin.toString());
        if (filters?.precoMax) params.append('precoMax', filters.precoMax.toString());
        if (filters?.cidade) params.append('cidade', filters.cidade);
        if (filters?.estado) params.append('estado', filters.estado);
        if (filters?.busca) params.append('busca', filters.busca);

        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const response = await api.get(`/ofertas?${params.toString()}`);
        const data = unwrapApiResponse<OfertasResponse>(response.data, { defaultValue: { ofertas: [], total: 0, page, totalPages: 1 } });
        // Normaliza a lista de ofertas e garante valores padrão seguros
        const ofertasNorm = mapOfertas(data?.ofertas);
        return {
            ofertas: ofertasNorm,
            total: typeof data?.total === 'number' ? data.total : 0,
            page: typeof data?.page === 'number' ? data.page : page,
            totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        };
    },

    /**
     * Busca uma oferta específica pelo seu ID e normaliza o resultado.
     */
    async getOfertaById(id: string): Promise<OfertaServico> {
        const response = await api.get(`/ofertas/${id}`);
        const data = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(data);
    },

    /**
     * Cria uma nova oferta (JSON) e retorna o recurso normalizado.
     * Possível melhoria: validar o payload antes do envio e tratar erros do backend com mensagens amigáveis.
     */
    async createOferta(data: CreateOfertaInput): Promise<OfertaServico> {
        const response = await api.post('/ofertas', data);
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Cria uma nova oferta usando FormData (imagens/vídeos).
     * Define cabeçalho multipart e permite anexos grandes (maxBodyLength Infinity).
     * Possíveis melhorias: limitar tamanho/quantidade de arquivos, progresso de upload e compressão de mídia.
     */
    async createOfertaMultipart(formData: FormData): Promise<OfertaServico> {
        const response = await api.post('/ofertas', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            maxBodyLength: Infinity,
        });
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Atualiza parcialmente uma oferta existente e normaliza a resposta.
     */
    async updateOferta(id: string, data: Partial<CreateOfertaInput>): Promise<OfertaServico> {
        const response = await api.put(`/ofertas/${id}`, data);
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Exclui uma oferta pelo ID.
     * Possível melhoria: tratar UI de forma otimista (optimistic update) e confirmar remoção.
     */
    async deleteOferta(id: string): Promise<void> {
        await api.delete(`/ofertas/${id}`);
    },

    /**
     * Lista ofertas do usuário autenticado.
     * Lida com diferentes formatos de resposta retornados pela API.
     */
    async getMinhasOfertas(): Promise<OfertaServico[]> {
        const response = await api.get('/ofertas/minhas');
        const data = unwrapApiResponse<OfertaServico[] | { ofertas: OfertaServico[] }>(response.data);
        // Aceita tanto um array puro quanto um objeto com a propriedade "ofertas"
        const list = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.ofertas)
                ? (data as any).ofertas
                : [];
        return mapOfertas(list);
    }
};

export default ofertaService;