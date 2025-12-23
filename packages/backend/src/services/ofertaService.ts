import mongoose from 'mongoose';
import { OfertaServico, IOfertaServico } from '../models/OfertaServico';
import User from '../models/User';
import { logger } from '../utils/logger';

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
            categoria,
            subcategoria,
            tipoPessoa,
            precoMin,
            precoMax,
            cidade,
            estado,
            busca,
            sort = 'relevancia',
            comMidia,
            lat,
            lng,
            page = 1,
            limit = 10,
        } = filters;

        const query: any = { status: { $ne: 'inativo' } };

        if (categoria) query.categoria = categoria;
        if (subcategoria) query.subcategoria = subcategoria;
        if (tipoPessoa) query['prestador.tipoPessoa'] = tipoPessoa;
        if (typeof precoMin === 'number') query.preco = { ...(query.preco || {}), $gte: precoMin };
        if (typeof precoMax === 'number') query.preco = { ...(query.preco || {}), $lte: precoMax };
        if (cidade) query['localizacao.cidade'] = cidade;
        if (estado) {
            if (Array.isArray(estado)) {
                query['localizacao.estado'] = { $in: estado };
            } else {
                query['localizacao.estado'] = estado;
            }
        }

        if (comMidia === true) {
            const mediaOr = [
                { imagens: { $exists: true, $ne: [] } },
                { videos: { $exists: true, $ne: [] } },
            ];
            query.$and = [...(query.$and || []), { $or: mediaOr }];
        }

        const hasBusca = Boolean(busca && busca.trim().length > 0);
        if (hasBusca && sort !== 'relevancia') {
            const regex = new RegExp((busca || '').trim(), 'i');
            query.$or = [
                { titulo: regex },
                { descricao: regex },
                { tags: regex },
            ];
        }

        const skip = (page - 1) * limit;

        if (sort === 'distancia' && typeof lat === 'number' && typeof lng === 'number') {
            const matchWithoutText = { ...query };
            const textMatch = hasBusca ? { $text: { $search: (busca || ''), $language: 'portuguese' } } : undefined;

            const pipeline: any[] = [
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lng, lat] },
                        distanceField: 'distancia',
                        spherical: true,
                        query: matchWithoutText,
                    }
                }
            ];

            if (textMatch) {
                pipeline.push({ $match: textMatch });
            }

            pipeline.push(
                { $sort: { distancia: 1 } },
                { $skip: skip },
                { $limit: limit },
            );

            logger.info('ofertas.list.geoNear', { lat, lng, skip, limit });

            const [ofertas, total] = await Promise.all([
                OfertaServico.aggregate(pipeline),
                OfertaServico.countDocuments({ ...(matchWithoutText as any), ...(textMatch || {}) }),
            ]);

            const totalPages = Math.ceil(total / limit);
            logger.info('ofertas.list.result', { total, totalPages });
            return { ofertas: ofertas as any, total, page, totalPages };
        }

        if (sort === 'relevancia') {
            const match: any = { ...query };
            if (hasBusca) {
                delete match.$or;
                match.$text = { $search: (busca || ''), $language: 'portuguese' };
            }

            const now = new Date();
            const pipeline: any[] = [
                { $match: match },
                {
                    $addFields: {
                        text_score: hasBusca ? { $meta: 'textScore' } : 0,
                        has_media: {
                            $cond: [
                                { $gt: [ { $size: { $ifNull: ['$imagens', []] } }, 0 ] },
                                1,
                                0
                            ]
                        },
                        rating_boost: {
                            $min: [
                                { $max: [ { $ifNull: ['$prestador.avaliacao', 0] }, 0 ] },
                                5
                            ]
                        },
                        recency_boost: {
                            $divide: [
                                0.5,
                                {
                                    $max: [
                                        1,
                                        {
                                            $divide: [
                                                { $subtract: [ now, { $ifNull: ['$updatedAt', '$createdAt'] } ] },
                                                1000 * 60 * 60 * 24
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        score: {
                            $add: [
                                '$text_score',
                                { $multiply: ['$has_media', 0.2] },
                                { $multiply: ['$rating_boost', 0.1] },
                                '$recency_boost'
                            ]
                        }
                    }
                },
                { $sort: { score: -1 } },
                { $skip: skip },
                { $limit: limit }
            ];

            logger.info('ofertas.list.relevancia', { hasBusca, skip, limit });

            const [ofertas, total] = await Promise.all([
                OfertaServico.aggregate(pipeline),
                OfertaServico.countDocuments(match),
            ]);

            const totalPages = Math.ceil(total / limit);
            logger.info('ofertas.list.result', { total, totalPages });
            return { ofertas: ofertas as any, total, page, totalPages };
        }

        let sortOptions: any = {};
        switch (sort) {
            case 'preco_menor':
                sortOptions = { preco: 1 };
                break;
            case 'preco_maior':
                sortOptions = { preco: -1 };
                break;
            case 'avaliacao':
                sortOptions = { 'prestador.avaliacao': -1 };
                break;
            case 'recente':
                sortOptions = { createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        logger.info('ofertas.list.simple', { filters, page, limit, skip, sortOptions });

        const [ofertas, total] = await Promise.all([
            OfertaServico.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            OfertaServico.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit);
        logger.info('ofertas.list.result', { total, totalPages });
        return { ofertas, total, page, totalPages };
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

        // ⚠️ SEM TRANSFORMAÇÃO: O schema agora aceita strings diretamente
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

        logger.info('ofertas.create.success', { ofertaId: (doc as any)._id, userId });

        return doc.toObject();
    },

    async update(userId: string, id: string, payload: Partial<IOfertaServico>): Promise<IOfertaServico | null> {
        const oferta = await OfertaServico.findById(id);
        if (!oferta) {
            logger.warn('ofertas.update.notFound', { id, userId });
            return null;
        }

        const prestadorRaw: any = (oferta as any).prestador?._id;
        const prestadorId = prestadorRaw && typeof prestadorRaw === 'object' && ('_id' in prestadorRaw)
            ? prestadorRaw._id
            : prestadorRaw;

        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.update.forbidden', { id, userId, owner: String(prestadorId) });
            const err: any = new Error('Sem permissão para atualizar esta oferta');
            err.status = 403;
            throw err;
        }

        // ⚠️ SEM TRANSFORMAÇÃO: Apenas atribui diretamente
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

        const prestadorRaw: any = (oferta as any).prestador?._id;
        const prestadorId = prestadorRaw && typeof prestadorRaw === 'object' && ('_id' in prestadorRaw)
            ? prestadorRaw._id
            : prestadorRaw;

        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.remove.forbidden', { id, userId, owner: String(prestadorId) });
            const err: any = new Error('Sem permissão para deletar esta oferta');
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
