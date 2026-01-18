import mongoose, { FilterQuery, PipelineStage } from 'mongoose';
import { OfertaServico, IOfertaServico } from '../models/OfertaServico';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * Tipo para consultas de filtro baseadas no modelo IOfertaServico.
 */
type OfertaFilterQuery = FilterQuery<IOfertaServico>;

/**
 * Singleton para controlar o estado da sincronização de índices do MongoDB.
 * Evita múltiplas tentativas de sincronização em paralelo.
 */
let indexesReady: Promise<void> | null = null;

/**
 * Garante que os índices definidos no modelo OfertaServico (especialmente índices de texto e geoespaciais)
 * estejam criados e sincronizados com o banco de dados.
 * 
 * @returns {Promise<void>} Promise que resolve quando a sincronização é concluída (com sucesso ou erro logado).
 */
const ensureIndexes = async (): Promise<void> => {
    if (!indexesReady) {
        // Inicia a sincronização e captura erros para não travar a aplicação
        indexesReady = OfertaServico.syncIndexes().then(() => {}).catch((err) => {
            logger.warn('ofertas.indexes.sync.error', { message: err?.message });
        });
    }
    await indexesReady;
};

/**
 * Opções de ordenação disponíveis para a listagem de ofertas.
 */
type SortOption = 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente' | 'distancia';

/**
 * Interface que define os filtros aceitos no método de listagem.
 */
export interface ListFilters {
    categoria?: string;
    subcategoria?: string;
    tipoPessoa?: 'PF' | 'PJ';
    precoMin?: number;
    precoMax?: number;
    cidade?: string;
    estado?: string | string[];
    busca?: string;
    sort?: SortOption;
    comMidia?: boolean;
    lat?: number;
    lng?: number;
    page?: number;
    limit?: number;
}

/**
 * Interface que define a estrutura de retorno paginada de ofertas.
 */
export interface PagedOfertas {
    ofertas: IOfertaServico[];
    total: number;
    page: number;
    totalPages: number;
}

/**
 * Serviço responsável pela gestão de Ofertas de Serviço.
 * Contém lógicas de listagem, criação, atualização e remoção.
 */
export const ofertaService = {
    /**
     * Lista ofertas de serviço com base em filtros, busca textual e geolocalização.
     * 
     * @param {ListFilters} filters - Objeto contendo os critérios de filtragem e paginação.
     * @returns {Promise<PagedOfertas>} Objeto contendo a lista de ofertas e metadados de paginação.
     */
    async list(filters: ListFilters = {}): Promise<PagedOfertas> {
        const {
            categoria, subcategoria, tipoPessoa, precoMin, precoMax, cidade, estado,
            busca, sort = 'relevancia', comMidia, lat, lng, page = 1, limit = 10,
        } = filters;

        // Inicializa a query filtrando apenas ofertas ativas
        const query: OfertaFilterQuery = { status: { $ne: 'inativo' } };
        const hasBusca = Boolean(busca && busca.trim().length > 0);

        // --- 1. Filtros Básicos ---
        
        if (categoria) query.categoria = categoria;
        if (subcategoria) query.subcategoria = subcategoria;
        if (tipoPessoa) query['prestador.tipoPessoa'] = tipoPessoa;
        
        // Filtro de faixa de preço
        if (typeof precoMin === 'number') query.preco = { ...(query.preco || {}), $gte: precoMin };
        if (typeof precoMax === 'number') query.preco = { ...(query.preco || {}), $lte: precoMax };
        
        // Filtros de localização geográfica (Cidade/Estado)
        if (cidade) query['localizacao.cidade'] = cidade;
        if (Array.isArray(estado) && estado.length > 0) {
            query['localizacao.estado'] = { $in: estado };
        } else if (typeof estado === 'string') {
            query['localizacao.estado'] = estado;
        }

        // Filtro para ofertas que possuam algum tipo de mídia (imagem ou vídeo)
        if (comMidia) {
            query.$and = [...(query.$and || []), { 
                $or: [
                    { imagens: { $exists: true, $ne: [] } }, 
                    { videos: { $exists: true, $ne: [] } }
                ] 
            }];
        }

        // --- 2. Lógica de Busca Textual ---
        
        // Se houver termo de busca, garante que os índices de texto existem e aplica o $text
        if (hasBusca) {
            await ensureIndexes();
            query.$text = { $search: busca!.trim(), $language: 'portuguese' };
        }

        const skip = (page - 1) * limit;

        /**
         * Pipeline de agregação reutilizável para enriquecer a oferta com dados do prestador.
         * Realiza um lookup na coleção de usuários e remove campos sensíveis.
         */
        const prestadorPopulationPipeline: PipelineStage[] = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'prestador._id',
                    foreignField: '_id',
                    as: 'prestadorInfo',
                },
            },
            {
                $addFields: {
                    prestador: {
                        $mergeObjects: ['$prestador', { $arrayElemAt: ['$prestadorInfo', 0] }],
                    },
                },
            },
            // Remove informações sensíveis do usuário para segurança
            { $project: { prestadorInfo: 0, 'prestador.password': 0, 'prestador.email': 0 } },
        ];

        // --- 3. Execução de Busca Geoespacial (Distância) ---
        
        if (sort === 'distancia' && typeof lat === 'number' && typeof lng === 'number') {
            let geoQuery = { ...query };

            // O MongoDB não permite o uso direto de $text dentro de um estágio $geoNear.
            // Solução: Realiza uma pré-busca para obter os IDs que casam com o texto e filtra por eles no $geoNear.
            if (hasBusca) {
                const searchResults = await OfertaServico.find(query).select('_id').lean();
                const ids = searchResults.map(doc => doc._id);
                delete geoQuery.$text;
                geoQuery._id = { $in: ids };
            }

            const pipeline: PipelineStage[] = [
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lng, lat] },
                        distanceField: 'distancia',
                        spherical: true,
                        query: geoQuery,
                    },
                },
                ...prestadorPopulationPipeline,
                { $skip: skip },
                { $limit: limit },
            ];

            // Executa a busca e a contagem total em paralelo
            const [ofertas, totalResult] = await Promise.all([
                OfertaServico.aggregate<IOfertaServico>(pipeline),
                OfertaServico.aggregate<{ count: number }>([
                    { $geoNear: { near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'distancia', spherical: true, query: geoQuery } },
                    { $count: 'count' }
                ]),
            ]);

            const total = totalResult[0]?.count ?? 0;
            return { ofertas, total, page, totalPages: Math.ceil(total / limit) };
        }

        // --- 4. Execução de Busca por Relevância (Text Score) ---
        
        if (sort === 'relevancia' && hasBusca) {
            const pipeline: PipelineStage[] = [
                { $match: query },
                // Adiciona o score de relevância do MongoDB
                { $addFields: { score: { $meta: 'textScore' } } },
                // Ordena pelo score (maior primeiro)
                { $sort: { score: -1 } },
                { $skip: skip },
                { $limit: limit },
                ...prestadorPopulationPipeline,
            ];

            const [ofertas, total] = await Promise.all([
                OfertaServico.aggregate<IOfertaServico>(pipeline),
                OfertaServico.countDocuments(query),
            ]);
            
            return { ofertas, total, page, totalPages: Math.ceil(total / limit) };
        }

        // --- 5. Busca Padrão (Ordenação Simples) ---
        
        // Define opções de ordenação baseadas no parâmetro sort
        let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
        switch (sort) {
            case 'preco_menor': sortOptions = { preco: 1 }; break;
            case 'preco_maior': sortOptions = { preco: -1 }; break;
            case 'avaliacao': sortOptions = { 'prestador.avaliacao': -1 }; break;
            case 'recente': sortOptions = { createdAt: -1 }; break;
        }

        // Utiliza busca padrão do Mongoose (mais eficiente que aggregation quando não há scores/geo)
        const [ofertas, total] = await Promise.all([
            OfertaServico.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
            OfertaServico.countDocuments(query),
        ]);

        return { ofertas, total, page, totalPages: Math.ceil(total / limit) };
    },

    /**
     * Obtém uma oferta específica pelo seu ID.
     * 
     * @param {string} id - ID da oferta no formato ObjectId.
     * @returns {Promise<IOfertaServico | null>} A oferta encontrada ou null se não existir ou ID inválido.
     */
    async getById(id: string): Promise<IOfertaServico | null> {
        // Valida se o ID fornecido é um ObjectId válido do MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn('ofertas.getById.invalidId', { id });
            return null;
        }

        const oferta = await OfertaServico.findById(id).lean();
        
        if (oferta) {
            logger.info('ofertas.getById.result', { id, found: true });
        } else {
            logger.warn('ofertas.getById.result', { id, found: false });
        }
        
        return oferta;
    },

    /**
     * Cria uma nova oferta de serviço vinculada a um usuário (prestador).
     * 
     * @param {string} userId - ID do usuário que está criando a oferta.
     * @param {Partial<IOfertaServico>} payload - Dados da oferta a serem salvos.
     * @returns {Promise<IOfertaServico>} A oferta criada.
     * @throws {Error} Se o usuário não for encontrado (404).
     */
    async create(userId: string, payload: Partial<IOfertaServico>): Promise<IOfertaServico> {
        // Busca dados do usuário para preencher informações básicas do prestador na oferta (denormalização)
        const user = await User.findById(userId).lean();
        if (!user) {
            logger.warn('ofertas.create.userNotFound', { userId });
            throw Object.assign(new Error('Usuário não encontrado'), { status: 404 });
        }

        const doc = await OfertaServico.create({
            ...payload,
            prestador: {
                _id: new mongoose.Types.ObjectId(userId),
                nome: user.nome,
                avatar: user.avatar,
                avaliacao: 5.0, // Avaliação inicial padrão
                tipoPessoa: user.tipoPessoa || 'PF',
            },
            status: payload.status ?? 'ativo',
        });

        logger.info('ofertas.create.success', { ofertaId: doc._id, userId });

        return doc.toObject();
    },

    /**
     * Atualiza uma oferta existente. Apenas o dono (prestador) pode realizar a atualização.
     * 
     * @param {string} userId - ID do usuário que solicita a atualização.
     * @param {string} id - ID da oferta a ser atualizada.
     * @param {Partial<IOfertaServico>} payload - Novos dados da oferta.
     * @returns {Promise<IOfertaServico | null>} A oferta atualizada ou null se não encontrada.
     * @throws {Error} Se o usuário não tiver permissão (403).
     */
    async update(userId: string, id: string, payload: Partial<IOfertaServico>): Promise<IOfertaServico | null> {
        const oferta = await OfertaServico.findById(id);
        if (!oferta) {
            logger.warn('ofertas.update.notFound', { id, userId });
            return null;
        }

        // Extrai o ID do prestador tratando possíveis variações de população do Mongoose
        const prestadorId = (oferta.prestador as any)?._id?._id || (oferta.prestador as any)?._id;

        // Verifica se o usuário autenticado é o mesmo que criou a oferta
        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.update.forbidden', { id, userId, owner: String(prestadorId) });
            const err = new Error('Sem permissão para atualizar esta oferta') as Error & { status: number };
            err.status = 403;
            throw err;
        }

        // Aplica as mudanças e salva
        Object.assign(oferta, payload);
        await oferta.save();
        
        logger.info('ofertas.update.success', { id, userId });
        return oferta.toObject();
    },

    /**
     * Remove uma oferta do sistema. Apenas o dono (prestador) pode realizar a remoção.
     * 
     * @param {string} userId - ID do usuário que solicita a remoção.
     * @param {string} id - ID da oferta a ser removida.
     * @returns {Promise<boolean>} True se removida com sucesso, false se não encontrada.
     * @throws {Error} Se o usuário não tiver permissão (403).
     */
    async remove(userId: string, id: string): Promise<boolean> {
        const oferta = await OfertaServico.findById(id);
        if (!oferta) {
            logger.warn('ofertas.remove.notFound', { id, userId });
            return false;
        }

        const prestadorId = (oferta.prestador as any)?._id?._id || (oferta.prestador as any)?._id;

        // Verifica permissão de propriedade
        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.remove.forbidden', { id, userId, owner: String(prestadorId) });
            const err = new Error('Sem permissão para deletar esta oferta') as Error & { status: number };
            err.status = 403;
            throw err;
        }

        await oferta.deleteOne();
        logger.info('ofertas.remove.success', { id, userId });
        return true;
    },

    /**
     * Lista todas as ofertas pertencentes a um usuário específico.
     * 
     * @param {string} userId - ID do usuário/prestador.
     * @returns {Promise<IOfertaServico[]>} Lista de ofertas do usuário.
     */
    async listByUser(userId: string): Promise<IOfertaServico[]> {
        const ofertas = await OfertaServico.find({ 'prestador._id': userId })
            .sort({ createdAt: -1 })
            .lean();
            
        logger.info('ofertas.listByUser.result', { userId, count: ofertas.length });
        return ofertas;
    },
};

export default ofertaService;
