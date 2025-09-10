import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ofertaService, { ListFilters } from '../services/ofertaService';
import { logger } from '../utils/logger';
import { OfertaFiltersInput, CreateOfertaInput, UpdateOfertaInput } from '../validation/ofertaValidation';

export const ofertaController = {
    async getOfertas(req: AuthRequest, res: Response) {
        try {
            const q = (req.query || {}) as unknown as OfertaFiltersInput;
            const filters: ListFilters = {
                categoria: q.categoria,
                precoMin: q.precoMin,
                precoMax: q.precoMax,
                cidade: q.cidade,
                estado: q.estado,
                busca: q.busca,
                page: q.page ?? 1,
                limit: q.limit ?? 10,
            };

            const result = await ofertaService.list(filters);

            res.status(200).json({
                success: true,
                message: 'Ofertas recuperadas com sucesso',
                data: result,
            });
        } catch (error: any) {
            logger.error('Erro ao listar ofertas', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },

    async getOfertaById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const oferta = await ofertaService.getById(id);
            if (!oferta) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta recuperada com sucesso', data: oferta });
        } catch (error: any) {
            logger.error('Erro ao obter oferta', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },

    async createOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }
            if (user.tipo !== 'provider') {
                res.status(403).json({ success: false, message: 'Apenas prestadores podem criar ofertas' });
                return;
            }

            const body = req.body as CreateOfertaInput;

            const created = await ofertaService.create(user.id, body as any);
            res.status(201).json({ success: true, message: 'Oferta criada com sucesso', data: created });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao criar oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    async updateOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }
            const { id } = req.params as { id: string };
            const body = req.body as UpdateOfertaInput;

            const updated = await ofertaService.update(user.id, id, body as any);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta atualizada com sucesso', data: updated });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao atualizar oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    async deleteOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }
            const { id } = req.params as { id: string };

            const removed = await ofertaService.remove(user.id, id);
            if (!removed) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta removida com sucesso' });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao remover oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    async getMinhasOfertas(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }

            const ofertas = await ofertaService.listByUser(user.id);
            res.json({ success: true, message: 'Ofertas recuperadas com sucesso', data: { ofertas } });
        } catch (error: any) {
            logger.error('Erro ao listar ofertas do usuário', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },
};

export default ofertaController;
