// Jest setup for backend tests
process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.CORS_ORIGIN = '*';
process.env.LOG_LEVEL = 'error';

// Optionally, silence console during tests to keep output clean
// You can comment these out if you want to see logs
const noop = () => {};
if (typeof console.info === 'function') console.info = noop as any;
if (typeof console.warn === 'function') console.warn = noop as any;
if (typeof console.debug === 'function') console.debug = noop as any;
