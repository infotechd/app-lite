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

// Mock expo-updates para evitar erro ESM no Jest e side effects
jest.mock('expo-updates', () => ({
    __esModule: true,
    default: {},
    reloadAsync: jest.fn(),
    checkForUpdateAsync: jest.fn(),
    fetchUpdateAsync: jest.fn(),
}));

// Mock sentry-expo e @sentry/react-native para manter no-op nos testes
jest.mock('sentry-expo', () => ({
    __esModule: true,
    init: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
    startSpan: jest.fn(() => ({ end: () => {} })),
}), { virtual: true });
jest.mock('@sentry/react-native', () => ({
    __esModule: true,
    init: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
    startSpan: jest.fn(() => ({ end: () => {} })),
}), { virtual: true });

// Note: Avoid importing heavy RN modules in setup to keep service tests isolated.
// If a UI test needs specific mocks (e.g., reanimated), consider mocking in the test file.

// Optional: silence console noise in tests
const noop = () => {};
if (typeof console.debug === 'function') console.debug = noop as any;

// Mock global fetch to avoid real network during API autodetection in tests
if (typeof (globalThis as any).fetch === 'undefined' || (globalThis as any).__FORCE_TEST_FETCH__) {
    ;(globalThis as any).fetch = jest.fn(async () => ({ ok: false })) as any;
}

// React Native test environment polyfills
try {
    const RN = require('react-native');
    
    // Ensure StyleSheet exists
    if (!RN.StyleSheet) {
        RN.StyleSheet = {};
    }

    // Define flatten on StyleSheet if it doesn't exist
    if (typeof RN.StyleSheet.flatten !== 'function') {
        RN.StyleSheet.flatten = (style: any) => {
            if (Array.isArray(style)) {
                return Object.assign({}, ...style);
            }
            return style;
        };
    }
} catch (e) {
    // Silently fail to avoid breaking test suites that don't need RN
}

// requestAnimationFrame polyfill for components or libraries relying on it
if (typeof (globalThis as any).requestAnimationFrame !== 'function') {
    ;(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
}

// Mock @expo/vector-icons para evitar erros de importação nos testes
jest.mock('@expo/vector-icons', () => ({
    MaterialIcons: 'MaterialIcons',
    MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Mock expo-video para evitar erro de modulo nativo nos testes
jest.mock('expo-video', () => ({
    VideoView: 'VideoView',
    useVideoPlayer: jest.fn(() => ({})),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));
