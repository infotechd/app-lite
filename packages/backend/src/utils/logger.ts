import winston from 'winston';
import type { Request, Response, NextFunction } from 'express';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaString}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    levels,
    format: consoleFormat,
    transports: [new winston.transports.Console()],
});

interface RequestWithUser extends Request {
    user?: { id?: string };
}

export const loggerUtils = {
    logRequest: (req: RequestWithUser, res: Response, responseTime: number) => {
        logger.http('HTTP Request', {
            method: req.method,
            url: req.originalUrl ?? req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.id,
        });
    },

    logError: (error: Error, context?: Record<string, unknown>) => {
        logger.error('Application Error', {
            message: error.message,
            stack: error.stack,
            context,
        });
    },

    logAuth: (action: string, userId?: string, email?: string, success = true) => {
        logger.info('Authentication Event', {
            action,
            userId,
            email,
            success,
            timestamp: new Date().toISOString(),
        });
    },

    logUpload: (userId: string | undefined, files: Express.Multer.File[] = [], success = true) => {
        logger.info('File Upload Event', {
            userId,
            filesCount: files.length,
            totalSize: files.reduce((sum, file) => sum + (file?.size ?? 0), 0),
            fileTypes: files.map((file) => file?.mimetype).filter(Boolean),
            success,
        });
    },

    logDatabase: (operation: string, collection: string, success = true, error?: Error) => {
        if (success) {
            logger.debug('Database Operation', { operation, collection, success });
        } else {
            logger.error('Database Error', {
                operation,
                collection,
                error: error?.message,
                stack: error?.stack,
            });
        }
    },
};

export const requestLogger = (req: RequestWithUser, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        loggerUtils.logRequest(req, res, responseTime);
    });
    next();
};

export default logger;

