// Domain-specific HTTP error classes to standardize error handling across the backend
// These expose a numeric `status` consumed by the global error middleware (app.ts)

export class BadRequestError extends Error {
    public readonly status: number = 400;
    constructor(message: string) {
        super(message);
        this.name = 'BadRequestError';
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

export class PayloadTooLargeError extends Error {
    public readonly status: number = 413;
    constructor(message: string) {
        super(message);
        this.name = 'PayloadTooLargeError';
        Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
    }
}
