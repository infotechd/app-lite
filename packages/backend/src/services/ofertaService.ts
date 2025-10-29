import mongoose from 'mongoose';
import { OfertaServico, IOfertaServico } from '../models/OfertaServico';
import User from '../models/User';
import { logger } from '../utils/logger';

// --- INÍCIO DA CORREÇÃO 1 ---
type SortOption = 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente';

export interface ListFilters {
    categoria?: string;
    subcategoria?: string;
    tipoPessoa?: 'PF' | 'PJ';
    precoMin?: number;
    precoMax?: number;
    cidade?: string;
    estado?: string;
    busca?: string;
    sort?: SortOption; // Adicionado
    comMidia?: boolean; // Adicionado
    page?: number;
    limit?: number;
}
// --- FIM DA CORREÇÃO 1 ---

export interface PagedOfertas {
    ofertas: IOfertaServico[];
    total: number;
    page: number;
    totalPages: number;
}

export const ofertaService = {
    async list(filters: ListFilters = {}): Promise<PagedOfertas> {
        // --- INÍCIO DA CORREÇÃO 2 ---
        const {
            categoria,
            subcategoria,
            tipoPessoa,
            precoMin,
            precoMax,
            cidade,
            estado,
            busca,
            sort = 'relevancia', // Adicionado
            comMidia, // Adicionado
            page = 1,
            limit = 10,
        } = filters;
        // --- FIM DA CORREÇÃO 2 ---

        const query: any = { status: { $ne: 'inativo' } };

        if (categoria) query.categoria = categoria;
        if (subcategoria) query.subcategoria = subcategoria;
        if (tipoPessoa) query['prestador.tipoPessoa'] = tipoPessoa;
        if (typeof precoMin === 'number') query.preco = { ...(query.preco || {}), $gte: precoMin };
        if (typeof precoMax === 'number') query.preco = { ...(query.preco || {}), $lte: precoMax };
        if (cidade) query['localizacao.cidade'] = cidade;
        if (estado) query['localizacao.estado'] = estado;

        // Filtro comMidia (se comMidia=true, busca ofertas que tenham 'imagens' não nulas ou com arrays não vazios)
        if (comMidia === true) {
            query.imagens = { $exists: true, $ne: [] };
        }

        if (busca && busca.trim().length > 0) {
            const regex = new RegExp(busca.trim(), 'i');
            query.$or = [
                { titulo: regex },
                { descricao: regex },
                { tags: regex },
            ];
        }

        const skip = (page - 1) * limit;

        // --- INÍCIO DA CORREÇÃO 3: Lógica de Ordenação ---
        let sortOptions: any = {};

        switch (sort) {
            case 'preco_menor':
                sortOptions = { preco: 1 }; // 1 para ASC (Ascendente)
                break;
            case 'preco_maior':
                sortOptions = { preco: -1 }; // -1 para DESC (Descendente)
                break;
            case 'avaliacao':
                sortOptions = { 'prestador.avaliacao': -1 };
                break;
            case 'recente':
                sortOptions = { createdAt: -1 };
                break;
            case 'relevancia':
            default:
                // TODO: Implementar lógica de relevância
                sortOptions = { createdAt: -1 };
                if (sort === 'relevancia') {
                    logger.warn(`Ordenação 'relevancia' solicitada, usando 'createdAt' como fallback.`);
                }
        }
        // --- FIM DA CORREÇÃO 3 ---

        // --- INÍCIO DA CORREÇÃO 4: LOG CORRIGIDO ---
        // Adicionamos 'sortOptions' ao log. Se você não vir 'sortOptions' nos seus logs, o backend está desatualizado.
        logger.info('ofertas.list', { filters, page, limit, skip, sortOptions });
        // --- FIM DA CORREÇÃO 4 ---

        const [ofertas, total] = await Promise.all([
            OfertaServico.find(query)
                .sort(sortOptions) // Aplicada a ordenação dinâmica
                .skip(skip)
                .limit(limit)
                .lean(),
            OfertaServico.countDocuments(query),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));

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
        // Obter dados do usuário para preencher prestador
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
                avaliacao: 5.0, // TODO: Puxar a avaliação real do usuário
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
        // Extrai o ID do prestador de forma robusta (ObjectId, string ou documento populado)
        const prestadorId = prestadorRaw && typeof prestadorRaw === 'object' && ('_id' in prestadorRaw)
            ? prestadorRaw._id
            : prestadorRaw;

        if (String(prestadorId) !== String(userId)) {
            logger.warn('ofertas.update.forbidden', { id, userId, owner: String(prestadorId) });
            const err: any = new Error('Sem permissão para atualizar esta oferta');
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