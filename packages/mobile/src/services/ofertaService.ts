import api from './api';
import { OfertaServico, CreateOfertaInput, OfertaFilters } from '@/types/oferta';
import { unwrapApiResponse } from '@/utils/api';

/**
 * Estrutura de resposta padronizada para listagem de ofertas.
 *
 * @property ofertas Lista de ofertas já normalizadas
 * @property total Quantidade total de registros para os filtros fornecidos
 * @property page Página atual retornada
 * @property totalPages Quantidade total de páginas disponíveis
 */
export interface OfertasResponse {
    ofertas: OfertaServico[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Parâmetros opcionais para listagem simplificada de ofertas.
 */
export interface ListOfertasParams {
    busca?: string;
    categoria?: string;
    subcategoria?: string;
    estado?: string | string[];
    cidade?: string;
    sort?: 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente' | 'distancia';
    comMidia?: boolean;
    tipoPessoa?: 'PF' | 'PJ';
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
}

// Funções auxiliares para normalizar dados da API para tipos estritos
// TODO: Validar esquemas de resposta (ex.: Zod) antes do mapeamento para maior robustez
/**
 * Converte um valor para número de forma segura.
 * - Retorna 0 quando não for um número válido (NaN, Infinity ou valores não numéricos).
 * - Evita que operações numéricas quebrem por entradas malformadas.
 *
 * @param value Valor possivelmente numérico vindo da API
 * @returns Número finito válido; retorna 0 para entradas inválidas
 *
 * Possível melhoria: usar biblioteca de precisão decimal (ex.: decimal.js) para valores monetários.
 */
function toNumberSafe(value: unknown): number {
    if (typeof value === 'number' && isFinite(value)) return value;
    const n = Number((value as any) ?? 0);
    return isFinite(n) ? n : 0;
}

/**
 * Extrai uma URL válida de diferentes formatos aceitos (string ou objeto com campos conhecidos).
 *
 * @param x Valor que pode ser string ou objeto contendo as propriedades `url`, `secure_url` ou `path`.
 * @returns A URL em formato string quando possível; `undefined` caso não seja possível inferir.
 */
function asUrlString(x: any): string | undefined {
    if (!x) return undefined;
    if (typeof x === 'string') return x;
    const maybe = x?.url || x?.secure_url || x?.path;
    return typeof maybe === 'string' && maybe.length > 0 ? maybe : undefined;
}

/**
 * Transforma um objeto "cru" vindo da API em um OfertaServico tipado.
 * - Garante que `imagens` seja sempre um array de strings e remove valores inválidos.
 * - Converte `preco` para número seguro.
 * - Inclui `videos` somente quando houver uma lista válida diferente de vazio.
 *
 * @param raw Objeto bruto retornado pela API
 * @returns Instância normalizada do tipo OfertaServico
 */
function mapOferta(raw: any): OfertaServico {
    const imagens = Array.isArray(raw?.imagens)
        ? (raw.imagens.map(asUrlString).filter((s: any) => typeof s === 'string' && s.length > 0) as string[])
        : [];
    const videosArr = Array.isArray(raw?.videos)
        ? (raw.videos.map(asUrlString).filter((s: any) => typeof s === 'string' && s.length > 0) as string[])
        : [];
    const videos = videosArr.length ? videosArr : undefined;
    return {
        ...raw,
        preco: toNumberSafe(raw?.preco),
        imagens,
        ...(videos ? { videos } : {}),
    } as OfertaServico;
}

/**
 * Mapeia uma lista qualquer para uma lista de OfertaServico já normalizada.
 *
 * @param list Coleção possivelmente vinda da API; se não for um array, retorna lista vazia
 * @returns Array de ofertas já normalizadas
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
     *
     * @param filters Filtros opcionais de busca de ofertas
     * @param page Página desejada (padrão 1)
     * @param limit Quantidade de itens por página (padrão 10)
     * @param signal AbortSignal opcional para cancelar a requisição
     * @returns Objeto com lista de ofertas e metadados de paginação
     */
    async getOfertas(
        filters?: OfertaFilters,
        page = 1,
        limit = 10,
        signal?: AbortSignal
    ): Promise<OfertasResponse> {
        const params: any = {};

        if (filters?.categoria) params.categoria = filters.categoria;
        if (filters?.subcategoria) params.subcategoria = filters.subcategoria;
        if (filters?.precoMin !== undefined) params.precoMin = filters.precoMin;
        if (filters?.precoMax !== undefined) params.precoMax = filters.precoMax;
        if (filters?.cidade) params.cidade = filters.cidade;
        if (filters?.estado) params.estado = filters.estado;
        if (filters?.busca) params.busca = filters.busca;
        if (filters?.sort) params.sort = filters.sort;
        if (filters?.comMidia === true) params.comMidia = 'true';
        if (filters?.tipoPessoa) params.tipoPessoa = filters.tipoPessoa;
        if (filters?.sort === 'distancia') {
            if (typeof filters?.lat === 'number') params.lat = filters.lat;
            if (typeof filters?.lng === 'number') params.lng = filters.lng;
        }

        params.page = page;
        params.limit = limit;

        const response = await api.get('ofertas', { params, signal });
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
     * Método simplificado de listagem de ofertas diretamente pela API.
     * Útil para casos em que não é necessário normalizar os dados.
     *
     * @param params Parâmetros de consulta para a API de ofertas
     * @returns Dados crus retornados pela API
     */
    async list(params: ListOfertasParams) {
        const response = await api.get('ofertas', { params });
        return response.data;
    },

    /**
     * Busca uma oferta específica pelo seu ID e normaliza o resultado.
     *
     * @param id Identificador da oferta
     * @returns Oferta normalizada correspondente ao ID
     */
    async getOfertaById(id: string): Promise<OfertaServico> {
        const response = await api.get(`ofertas/${id}`);
        const data = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(data);
    },

    /**
     * Cria uma nova oferta (JSON) e retorna o recurso normalizado.
     * Possível melhoria: validar o payload antes do envio e tratar erros do backend com mensagens amigáveis.
     *
     * @param data Payload para criação da oferta
     * @returns Oferta criada já normalizada
     */
    async createOferta(data: CreateOfertaInput): Promise<OfertaServico> {
        const response = await api.post('ofertas', data);
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Cria uma nova oferta usando FormData (imagens/vídeos).
     * Define cabeçalho multipart e permite anexos grandes (maxBodyLength Infinity).
     * Possíveis melhorias: limitar tamanho/quantidade de arquivos, progresso de upload e compressão de mídia.
     *
     * @param formData FormData contendo campos e arquivos da oferta
     * @returns Oferta criada já normalizada
     */
    async createOfertaMultipart(formData: FormData): Promise<OfertaServico> {
        const response = await api.post('ofertas', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            maxBodyLength: Infinity,
        });
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Atualiza parcialmente uma oferta existente e normaliza a resposta.
     *
     * @param id Identificador da oferta a ser atualizada
     * @param data Campos parciais a serem atualizados
     * @returns Oferta atualizada já normalizada
     */
    async updateOferta(id: string, data: Partial<CreateOfertaInput>): Promise<OfertaServico> {
        const response = await api.put(`ofertas/${id}`, data);
        const payload = unwrapApiResponse<OfertaServico>(response.data);
        return mapOferta(payload);
    },

    /**
     * Exclui uma oferta pelo ID.
     * Possível melhoria: tratar UI de forma otimista (optimistic update) e confirmar remoção.
     *
     * @param id Identificador da oferta a ser removida
     * @returns Promise resolvida quando a remoção for concluída
     */
    async deleteOferta(id: string): Promise<void> {
        await api.delete(`ofertas/${id}`);
    },

    /**
     * Lista ofertas do usuário autenticado.
     * Lida com diferentes formatos de resposta retornados pela API.
     *
     * @returns Lista de ofertas do usuário atual, já normalizadas
     */
    async getMinhasOfertas(): Promise<OfertaServico[]> {
        const response = await api.get('ofertas/minhas');
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