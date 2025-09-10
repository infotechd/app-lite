/**
 * Jest configuration for Super App backend (TypeScript + Node)
 */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    roots: ['<rootDir>/src'],
    setupFiles: ['<rootDir>/jest.setup.ts'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverage: true,
    collectCoverageFrom: [
        // Focamos cobertura nos arquivos principais até ampliarmos a suíte
        'src/controllers/uploadController.ts',
        'src/services/uploadService.ts',
        '!src/**/__tests__/**'
    ],
    coverageThreshold: {
        global: {
            branches: 40,
            functions: 40,
            lines: 40,
            statements: 40,
        },
        'src/controllers/uploadController.ts': {
            branches: 40,
            functions: 40,
            lines: 40,
            statements: 40,
        },
        'src/services/uploadService.ts': {
            branches: 40,
            functions: 40,
            lines: 40,
            statements: 40,
        },
    },
    coverageDirectory: '<rootDir>/coverage'
};