/**
 * Jest config for Super App Mobile (Expo SDK 53)
 */
module.exports = {
    preset: 'jest-expo',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.pre-setup.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '@react-native/js-polyfills/(.*)$': '<rootDir>/__mocks__/rn-polyfill-stub.js',
        '^expo-modules-core(?:/(.*))?$': '<rootDir>/__mocks__/expo-modules-core-stub.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|@react-native-async-storage|expo(nent)?|@expo(nent)?/.*|expo-modules-core|react-native-reanimated|react-native-gesture-handler|react-native-vector-icons)/)'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/screens/app/__tests__/'
    ],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/services/uploadService.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 40,
            functions: 40,
            lines: 40,
            statements: 40,
        },
    },
    coverageDirectory: '<rootDir>/coverage'
};
