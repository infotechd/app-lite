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
            rootDir: '.',
            testEnvironment: '<rootDir>/packages/mobile/jest.env.js',
            setupFiles: ['<rootDir>/packages/mobile/jest.global.js', '<rootDir>/packages/mobile/jest.pre-setup.js'],
            setupFilesAfterEnv: ['<rootDir>/packages/mobile/jest.setup.ts'],
            transform: {
                '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
            },
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/packages/mobile/src/$1',
                '^@react-native/js-polyfills$': '<rootDir>/packages/mobile/jest.mocks/jsPolyfillsMock.js',
                '^react-native/jest/setup$': '<rootDir>/packages/mobile/jest.mocks/rnJestSetupMock.js',
            },
            transformIgnorePatterns: [
                'node_modules/(?!((jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|react-native-safe-area-context))'
            ],
            testMatch: ['<rootDir>/packages/mobile/src/**/?(*.)+(spec|test).{ts,tsx}'],
            moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
            collectCoverageFrom: [
                'packages/mobile/src/**/*.{ts,tsx}',
                '!packages/mobile/src/**/__tests__/**'
            ],
            globals: {
                __DEV__: true,
                __TEST__: true
            }
        }
    ]
};
