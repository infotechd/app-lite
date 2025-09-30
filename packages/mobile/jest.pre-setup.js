// Ensure a minimal global expo object exists before jest-expo preset runs
// This avoids destructuring errors in jest-expo setup that expects globalThis.expo
if (typeof globalThis.expo === 'undefined') {
  globalThis.expo = { EventEmitter: class {} };
}
