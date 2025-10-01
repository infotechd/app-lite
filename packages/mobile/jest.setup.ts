/// <reference types="jest" />
// Jest setup for Super App Mobile (Expo SDK 53)

// Definir variáveis globais do React Native para o ambiente de teste
global.__DEV__ = true;
global.__TEST__ = true;

// Provide minimal global expo object to satisfy jest-expo preset
// @ts-ignore
(globalThis as any).expo = (globalThis as any).expo ?? { EventEmitter: class {} };

// Ensure Platform defaults can be provided by individual tests when needed.
// Note: Avoid globally mocking 'react-native' here to prevent ESM/CJS interop issues in Jest.

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Note: Avoid importing heavy RN modules in setup to keep service tests isolated.
// If a UI test needs specific mocks (e.g., reanimated), consider mocking in the test file.

// Optional: silence console noise in tests
const noop = () => {};
if (typeof console.debug === 'function') console.debug = noop as any;

// Mock global fetch to avoid real network during API autodetection in tests
if (typeof (globalThis as any).fetch === 'undefined' || (globalThis as any).__FORCE_TEST_FETCH__) {
    ;(globalThis as any).fetch = jest.fn(async () => ({ ok: false })) as any;
}
