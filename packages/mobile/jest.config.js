/**
 * Jest config for Super App Mobile (Expo SDK 53)
 */
module.exports = {
    preset: 'jest-expo',
    // Use a custom environment that ensures global expo object exists before jest-expo setup runs
    testEnvironment: '<rootDir>/jest.env.js',
    // Ensure expo globals exist as early as possible
    setupFiles: ['<rootDir>/jest.global.js', '<rootDir>/jest.pre-setup.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '@react-native/js-polyfills/(.*)$': '<rootDir>/__mocks__/rn-polyfill-stub.js',
        '^expo-modules-core(?:/(.*))?$': '<rootDir>/__mocks__/expo-modules-core-stub.js',
        // Patch jest-expo setup to ensure expo global is available
        '^jest-expo/src/preset/setup$': '<rootDir>/__mocks__/jest-expo-setup-stub.js',
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
