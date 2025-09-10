// Global Jest setup for mobile tests

// Mock AsyncStorage to avoid requiring native modules during tests
jest.mock('@react-native-async-storage/async-storage', () => {
    const store = new Map();
    return {
        getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: jest.fn(async (key, value) => { store.set(key, value); }),
        removeItem: jest.fn(async (key) => { store.delete(key); }),
        clear: jest.fn(async () => { store.clear(); }),
    };
});

// Ensure global expo object exists for jest-expo preset
if (typeof globalThis.expo === 'undefined') {
    globalThis.expo = {};
}
// Minimal stubs required by jest-expo setup
if (typeof globalThis.expo.EventEmitter === 'undefined') {
    globalThis.expo.EventEmitter = function EventEmitter() {};
}
if (typeof globalThis.expo.NativeModule === 'undefined') {
    globalThis.expo.NativeModule = function NativeModule() {};
}
if (typeof globalThis.expo.SharedObject === 'undefined') {
    globalThis.expo.SharedObject = function SharedObject() {};
}
if (typeof globalThis.expo.SharedRef === 'undefined') {
    globalThis.expo.SharedRef = function SharedRef() {};
}
