import mongoose from 'mongoose';
import config from '.';
import logger, { loggerUtils } from '../utils/logger';

// Configurar Mongoose
mongoose.set('strictQuery', true);

const connectDB = async (): Promise<void> => {
    if (config.SKIP_DB) {
        logger.warn('SKIP_DB habilitado: iniciando servidor sem conexão ao MongoDB');
        return;
    }

    const uri = config.MONGO_URI;

    try {
        await mongoose.connect(uri, {
            // useNewUrlParser/useUnifiedTopology são default em mongoose >= 6
            // deixando objeto de opções vazio para compatibilidade
        } as any);

        const connection = mongoose.connection;

        connection.on('connected', async () => {
            logger.info('Conectado ao MongoDB com sucesso');
            loggerUtils.logDatabase('connect', 'mongodb', true);

            // Criação de índices para GridFS (dica de performance)
            try {
                const db: any = (mongoose.connection as any).db;
                const bucketName = process.env.GRIDFS_BUCKET_NAME || 'app_lite_uploads';
                const filesCollection = db.collection(`${bucketName}.files`);

                // Índice para acelerar filtragem por usuário
                await filesCollection.createIndex({ 'metadata.uploadedBy': 1 });
                // Índice para acelerar ordenação por data de upload
                await filesCollection.createIndex({ uploadDate: -1 });

                logger.info(`Índices de GridFS garantidos para ${bucketName}.files`);
            } catch (idxErr) {
                logger.warn('Falha ao criar índices de GridFS (prosseguindo sem travar):', idxErr);
            }
        });

        connection.on('error', (err) => {
            logger.error('Erro na conexão com MongoDB:', err);
            loggerUtils.logDatabase('connect', 'mongodb', false, err as any);
        });

        connection.on('disconnected', () => {
            logger.warn('Desconectado do MongoDB');
            loggerUtils.logDatabase('disconnect', 'mongodb', true);
        });

        // Evento de reconexão (quando suportado pelo driver)
        // Não depende de dados sensíveis
        // Alguns ambientes podem não disparar este evento; é seguro mantê-lo
        (connection as any).on('reconnected', () => {
            logger.info('Reconectado ao MongoDB');
            loggerUtils.logDatabase('reconnect', 'mongodb', true);
        });

    } catch (error) {
        logger.error('Falha ao conectar ao MongoDB:', error);
        loggerUtils.logDatabase('connect', 'mongodb', false, error as any);
        // Em produção, falhar o boot; em dev, apenas warn
        if (config.IS_PROD) {
            throw error;
        }
    }
};

export const isDbReady = (): boolean => {
    const conn: any = mongoose?.connection as any;
    return !!conn && conn.readyState === 1 && !!conn.db;
};

export const getDatabase = (): any | null => {
    // Retorna a instância atual do banco para uso com GridFSBucket, ou null se indisponível
    return isDbReady() ? (mongoose.connection as any).db : null;
};

export default connectDB;
