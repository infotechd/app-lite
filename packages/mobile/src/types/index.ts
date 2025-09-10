// Barrel file for types to support alias imports like `@/types`
// Export user-related types
export * from './user';

// Export navigation types if present
export * from './navigation';

// Common error type used across utilities and API handlers
export interface AppError {
    message: string;
    code?: string;
    field?: string;
}
