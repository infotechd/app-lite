import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes';
import config from './config';
import { requestLogger, loggerUtils } from './utils/logger';

// Cria e configura a aplicação Express
const app: express.Application = express();

// Segurança básica
app.disable('x-powered-by');
app.use(helmet());

// CORS com lista de origens permitidas (ou todos com "*")
app.use(
    cors({
        origin: (origin, callback) => {
            // Em desenvolvimento, permitir todas as origens
            if (config.NODE_ENV === 'development') {
                return callback(null, true);
            }
            
            // Permite ferramentas locais (sem origin) e wildcard
            if (!origin || config.CORS_ORIGIN === '*') {
                return callback(null, true);
            }
            
            if (config.CORS_ALLOWED_ORIGINS_SET.has(origin)) {
                return callback(null, true);
            }
            
            // Em produção, bloquear origens não permitidas
            return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
);

// Compressão e parsers
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger de requisições
app.use(requestLogger as any);

// Rota inicial informativa
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Super App Backend ativo',
        data: {
            env: config.NODE_ENV,
            apiBase: '/api',
        },
    });
});

// Rotas da API
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        error: `Cannot ${req.method} ${req.originalUrl}`,
    });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Log estruturado do erro com contexto mínimo (sem PII)
    loggerUtils.logError(err, {
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id,
        params: req.params,
        query: req.query,
    });
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? 'Erro interno do servidor' : err?.message || 'Erro',
        error: status === 500 ? undefined : err?.message,
    });
});

export default app;
