import jwt, { JwtPayload, VerifyOptions, SignOptions } from 'jsonwebtoken';
import config from '../config';

export type DecodedToken = JwtPayload | string | { userId?: string };

/**
 * Verify JWT using the current secret and, if it fails due to signature, tries the previous secret (rotation).
 * Enforces algorithm whitelist (HS256).
 */
export function verifyJwtWithRotation(token: string): DecodedToken {
    const options: VerifyOptions = { algorithms: [config.JWT_ALGORITHM] } as const;
    try {
        return jwt.verify(token, config.JWT_SECRET, options);
    } catch (errPrimary: any) {
        // If a previous secret is configured, try it as a fallback.
        if (config.JWT_SECRET_PREVIOUS) {
            try {
                return jwt.verify(token, config.JWT_SECRET_PREVIOUS, options);
            } catch {
                // ignore and rethrow primary
            }
        }
        throw errPrimary;
    }
}

/** Sign an access token using the project standard algorithm. */
export function signAccessToken(payload: object, expiresIn?: string): string {
    const opts: SignOptions = {
        algorithm: config.JWT_ALGORITHM,
        expiresIn: (expiresIn || process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.JWT_SECRET, opts);
}

/** Sign a refresh token (if used) with its dedicated secret. */
export function signRefreshToken(payload: object, expiresIn?: string): string {
    const opts: SignOptions = {
        algorithm: config.JWT_ALGORITHM,
        expiresIn: (expiresIn || process.env.REFRESH_JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.REFRESH_JWT_SECRET, opts);
}
