import 'express';

declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            email?: string;
            nome?: string;
            tipo?: 'buyer' | 'provider' | 'advertiser';
        };
    }
}
