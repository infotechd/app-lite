// jest.config.js
module.exports = {
    projects: [
        {
            displayName: 'backend',
            testMatch: ['<rootDir>/packages/backend/src/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            rootDir: '.',
            setupFilesAfterEnv: ['<rootDir>/packages/backend/jest.setup.ts'],
            moduleFileExtensions: ['ts', 'js', 'json'],
            collectCoverageFrom: [
                'packages/backend/src/**/*.ts',
                '!packages/backend/src/**/__tests__/**',
                '!packages/backend/src/**/*.test.ts'
            ]
        },
        {
            displayName: 'mobile',
            testMatch: ['<rootDir>/packages/mobile/src/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            rootDir: '.',
            setupFilesAfterEnv: ['<rootDir>/packages/mobile/jest.setup.ts'],
            moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/packages/mobile/src/$1'
            },
            globals: {
                __DEV__: true,
                __TEST__: true
            },
            collectCoverageFrom: [
                'packages/mobile/src/**/*.{ts,tsx}',
                '!packages/mobile/src/**/__tests__/**',
                '!packages/mobile/src/**/*.test.{ts,tsx}'
            ]
        }
    ]
};
