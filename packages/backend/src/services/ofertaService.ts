import mongoose, { FilterQuery, PipelineStage } from 'mongoose';
import { OfertaServico, IOfertaServico } from '../models/OfertaServico';
import User from '../models/User';
import { logger } from '../utils/logger';

type OfertaFilterQuery = FilterQuery<IOfertaServico>;

let indexesReady: Promise<void> | null = null;
const ensureIndexes = async (): Promise<void> => {
    if (!indexesReady) {
        indexesReady = OfertaServico.syncIndexes().then(() => {}).catch((err) => {
            logger.warn('ofertas.indexes.sync.error', { message: err?.message });
        });
    }
    await indexesReady;
};

type SortOption = 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente' | 'distancia';

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

export interface PagedOfertas {
    ofertas: IOfertaServico[];
    total: number;
    page: number;
    totalPages: number;
}

export const ofertaService = {
    async list(filters: ListFilters = {}): Promise<PagedOfertas> {
        const {
            categoria, subcategoria, tipoPessoa, precoMin, precoMax, cidade, estado,
            busca, sort = 'relevancia', comMidia, lat, lng, page = 1, limit = 10,
        } = filters;

        const query: OfertaFilterQuery = { status: { $ne: 'inativo' } };
        const hasBusca = Boolean(busca && busca.trim().length > 0);

        // 1. Filtros básicos
        if (categoria) query.categoria = categoria;
        if (subcategoria) query.subcategoria = subcategoria;
        if (tipoPessoa) query['prestador.tipoPessoa'] = tipoPessoa;
        if (typeof precoMin === 'number') query.preco = { ...(query.preco || {}), $gte: precoMin };
        if (typeof precoMax === 'number') query.preco = { ...(query.preco || {}), $lte: precoMax };
        if (cidade) query['localizacao.cidade'] = cidade;
        if (Array.isArray(estado) && estado.length > 0) {
            query['localizacao.estado'] = { $in: estado };
        } else if (typeof estado === 'string') {
            query['localizacao.estado'] = estado;
        }
        if (comMidia) {
            query.$and = [...(query.$and || []), { $or: [{ imagens: { $exists: true, $ne: [] } }, { videos: { $exists: true, $ne: [] } }] }];
        }

        // 2. Lógica de busca unificada com $text
        if (hasBusca) {
            await ensureIndexes();
            query.$text = { $search: busca!.trim(), $language: 'portuguese' };
        }

        const skip = (page - 1) * limit;

        // Pipeline de população de dados do prestador (reutilizável)
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
            { $project: { prestadorInfo: 0, 'prestador.password': 0, 'prestador.email': 0 } },
        ];

        // 3. Execução dos diferentes tipos de busca
        if (sort === 'distancia' && typeof lat === 'number' && typeof lng === 'number') {
            let geoQuery = { ...query };

            // O MongoDB não permite $text dentro de $geoNear.
            // Para manter a consistência e usar o motor $text, fazemos uma pré-busca dos IDs.
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

        if (sort === 'relevancia' && hasBusca) {
            const pipeline: PipelineStage[] = [
                { $match: query },
                { $addFields: { score: { $meta: 'textScore' } } },
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

        // 4. Busca padrão (sem relevância ou distância)
        let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
        switch (sort) {
            case 'preco_menor': sortOptions = { preco: 1 }; break;
            case 'preco_maior': sortOptions = { preco: -1 }; break;
            case 'avaliacao': sortOptions = { 'prestador.avaliacao': -1 }; break;
            case 'recente': sortOptions = { createdAt: -1 }; break;
        }

        const [ofertas, total] = await Promise.all([
            OfertaServico.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
            OfertaServico.countDocuments(query),
        ]);

        return { ofertas, total, page, totalPages: Math.ceil(total / limit) };
    },

    async getById(id: string): Promise<IOfertaServico | null> {
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

    async create(userId: string, payload: Partial<IOfertaServico>): Promise<IOfertaServico> {
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
                avaliacao: 5.0,
                tipoPessoa: user.tipoPessoa || 'PF',
            },
            status: payload.status ?? 'ativo',
        });

        logger.info('ofertas.create.success', { ofertaId: doc._id, userId });

        return doc.toObject();
    },

    async update(userId: string, id: string, payload: Partial<IOfertaServico>): Promise<IOfertaServico | null> {
        const oferta = await OfertaServico.findById(id);
        if (!oferta) {
            logger.warn('ofertas.update.notFound', { id, userId });
            return null;
        }

        const prestadorId = oferta.prestador._id;

        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.update.forbidden', { id, userId, owner: String(prestadorId) });
            const err = new Error('Sem permissão para atualizar esta oferta') as Error & { status: number };
            err.status = 403;
            throw err;
        }

        Object.assign(oferta, payload);
        await oferta.save();
        logger.info('ofertas.update.success', { id, userId });
        return oferta.toObject();
    },

    async remove(userId: string, id: string): Promise<boolean> {
        const oferta = await OfertaServico.findById(id);
        if (!oferta) {
            logger.warn('ofertas.remove.notFound', { id, userId });
            return false;
        }

        const prestadorId = oferta.prestador._id;

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

    async listByUser(userId: string): Promise<IOfertaServico[]> {
        const ofertas = await OfertaServico.find({ 'prestador._id': userId })
            .sort({ createdAt: -1 })
            .lean();
        logger.info('ofertas.listByUser.result', { userId, count: ofertas.length });
        return ofertas;
    },
};

export default ofertaService;
