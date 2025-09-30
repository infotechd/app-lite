// Stub for jest-expo preset setup to avoid crashing when global expo is missing
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = {};
}
if (typeof globalThis.expo.EventEmitter === 'undefined') {
  globalThis.expo.EventEmitter = function EventEmitter() {};
}

module.exports = {};
