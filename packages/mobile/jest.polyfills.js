// Basic polyfills for RN/Expo tests without react-native/jest/setup

// global.fetch mock (if needed by code)
if (typeof global.fetch === 'undefined') {
    global.fetch = () => Promise.reject(new Error('fetch not mocked'));
}

// navigator.userAgent to satisfy some libs
if (typeof global.navigator === 'undefined') {
    global.navigator = {};
}
if (!global.navigator.userAgent) {
    global.navigator.userAgent = 'jest';
}

// TextEncoder/TextDecoder for whatwg-url usage
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
