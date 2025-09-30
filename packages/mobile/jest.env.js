// Custom Jest environment to ensure global expo object exists before jest-expo setup runs
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class ExpoPatchedEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    const g = this.global;
    // Ensure expo exists on test environment global
    if (typeof g.expo === 'undefined') {
      g.expo = {};
    }
    if (typeof g.expo.EventEmitter === 'undefined') {
      g.expo.EventEmitter = function EventEmitter() {};
    }
    // Also mirror to globalThis for any direct access
    if (typeof globalThis.expo === 'undefined') {
      globalThis.expo = {};
    }
    if (typeof globalThis.expo.EventEmitter === 'undefined') {
      globalThis.expo.EventEmitter = function EventEmitter() {};
    }
  }
}

module.exports = ExpoPatchedEnvironment;
