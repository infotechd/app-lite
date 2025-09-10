/// <reference types="jest" />
// Jest setup for Super App Mobile (Expo SDK 53)
// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence RN Animated warnings (guard for RN versions)
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native/Libraries/Animated/NativeAnimatedHelper');
    jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (_) {
    // ignore if path changed in this RN version
}

// Use reanimated mock
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Gesture handler basic mock
jest.mock('react-native-gesture-handler', () => ({}));

// Optional: screens module basic mock for native screens
jest.mock('react-native-screens', () => ({
    enableScreens: jest.fn(),
}));

// Optional: silence console noise in tests
const noop = () => {};
if (typeof console.debug === 'function') console.debug = noop as any;
