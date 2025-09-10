import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Em ambiente de teste, desabilitar rate limiter para não flakiness
const isTest = process.env.NODE_ENV === 'test';
const passThrough = (req: Request, res: Response, next: NextFunction) => {
    // Marcar como intencionalmente não utilizados para evitar TS6133 em ambientes de teste
    void req;
    void res;
    next();
};

// Rate limiter para autenticação
export const authLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        limit: 5, // 5 tentativas por IP
        message: {
            success: false,
            message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

// Rate limiter geral
export const generalLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        limit: 100, // 100 requests por IP
        message: {
            success: false,
            message: 'Muitas requisições. Tente novamente em 15 minutos.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });