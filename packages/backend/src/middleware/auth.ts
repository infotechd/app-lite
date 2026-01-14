import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import logger from '../utils/logger';
import { verifyJwtWithRotation } from '../utils/jwt';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email?: string;
        nome?: string;
    };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Token de acesso não fornecido'
            });
            return;
        }

        const decoded: any = verifyJwtWithRotation(token) as any;
        const userId = (decoded && typeof decoded === 'object' && 'userId' in decoded)
            ? (decoded as any).userId
            : undefined;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Token inválido' });
            return;
        }
        const user = await User.findById(userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
            return;
        }

        if (!user.ativo) {
            res.status(401).json({
                success: false,
                message: 'Conta desativada'
            });
            return;
        }

        const userIdStr = (user as any)?.id ?? (user as any)?._id?.toString?.() ?? String((user as any)?._id);

        req.user = {
            id: String(userIdStr),
            email: (user as any).email,
            nome: (user as any).nome,
        };
        next();
    } catch (error) {
        logger.error('Erro na autenticação:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
};