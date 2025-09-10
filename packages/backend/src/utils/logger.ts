import winston from 'winston';
import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';

// Garantir que a pasta de logs exista
const logsDir = path.join(process.cwd(), 'logs');
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (e) {
    // não bloquear a aplicação se não conseguir criar pasta de logs
}

// Configuração de níveis de log
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Cores para cada nível
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para logs
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;

        let metaString = '';
        if (Object.keys(meta).length > 0) {
            metaString = JSON.stringify(meta, null, 2);
        }

        return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
);

// Formato para arquivos (sem cores)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Transports
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format
    }),

    // Arquivo para todos os logs
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'app.log'),
        level: 'info',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),

    // Arquivo específico para erros
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];

// Criar logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false,
});


// Funções utilitárias
export const loggerUtils = {
    // Log de requisição HTTP
    logRequest: (req: any, res: any, responseTime: number) => {
        logger.http('HTTP Request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.id
        });
    },

    // Log de erro com contexto
    logError: (error: Error, context?: any) => {
        logger.error('Application Error', {
            message: error.message,
            stack: error.stack,
            context
        });
    },

    // Log de autenticação
    logAuth: (action: string, userId?: string, email?: string, success = true) => {
        logger.info('Authentication Event', {
            action,
            userId,
            email,
            success,
            timestamp: new Date().toISOString()
        });
    },

    // Log de upload
    logUpload: (userId?: string, files: Express.Multer.File[] = [], success = true) => {
        try {
            logger.info('File Upload Event', {
                userId,
                filesCount: Array.isArray(files) ? files.length : 0,
                totalSize: (Array.isArray(files) ? files : []).reduce((sum, file) => sum + (file?.size ?? 0), 0),
                fileTypes: (Array.isArray(files) ? files : []).map(f => f?.mimetype).filter(Boolean),
                success
            });
        } catch (e) {
            // não lançar erro por causa de log
        }
    },

    // Log de operação de banco
    logDatabase: (operation: string, collection: string, success = true, error?: Error) => {
        if (success) {
            logger.debug('Database Operation', {
                operation,
                collection,
                success
            });
        } else {
            logger.error('Database Error', {
                operation,
                collection,
                error: error?.message,
                stack: error?.stack
            });
        }
    }
};

// Middleware de log para Express
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const responseTime = Date.now() - start;
        loggerUtils.logRequest(req, res, responseTime);
    });

    next();
};

export default logger;