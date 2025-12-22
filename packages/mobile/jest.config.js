// packages/mobile/jest.config.js
module.exports = {
    testEnvironment: '<rootDir>/jest.env.js',
    setupFiles: ['<rootDir>/jest.global.js', '<rootDir>/jest.pre-setup.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    transform: {
        '^.+\\\.(js|jsx|ts|tsx)$': 'babel-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@react-native/js-polyfills$': '<rootDir>/jest.mocks/jsPolyfillsMock.js',
        '^react-native/jest/setup$': '<rootDir>/jest.mocks/rnJestSetupMock.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(.pnpm/)?((jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|react-native-safe-area-context))'
    ],
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/__tests__/**'
    ],
    coverageDirectory: '<rootDir>/coverage'
};
