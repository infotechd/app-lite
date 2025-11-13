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

// Mock react-native-paper with minimal components to make UI tests deterministic and avoid SafeArea deps
jest.mock('react-native-paper', () => {
    const React = require('react');

    // Provide minimal MD3LightTheme for modules that import it in tests
    const MD3LightTheme = { colors: {} };

    const Provider = ({ children }) => React.createElement(React.Fragment, null, children);

    const Button = (props) => {
        const merged = { accessibilityRole: 'button', ...props };
        return React.createElement('RNPButton', merged, merged.children);
    };

    const Text = (props) => React.createElement('RNPText', props, props.children);
    const TextInput = (props) => React.createElement('RNPTextInput', props, props.children);

    const HelperText = ({ children, visible, ...rest }) => visible ? React.createElement('RNPHelperText', rest, children) : null;

    const Snackbar = ({ children, visible, ...rest }) => visible ? React.createElement('RNPSnackbar', rest, children) : null;

    // Minimal Chip mock
    const Chip = (props) => React.createElement('RNPChip', props, props.children);

    // Minimal Menu mock: renders anchor always and children when visible
    const Menu = ({ visible, anchor, children, ...rest }) => {
        return React.createElement(
            'RNPMenu',
            { visible, ...rest },
            [anchor, visible ? children : null]
        );
    };
    Menu.Item = (props) => React.createElement('RNPMenuItem', props, props.title);

    const SegmentedButtons = ({ value, onValueChange, buttons = [], ...rest }) => {
        const items = buttons.map((btn) =>
            React.createElement(
                'RNPSegItem',
                {
                    key: btn.value,
                    testID: btn.testID || `seg-${btn.value}`,
                    onPress: () => onValueChange && onValueChange(btn.value),
                    value: btn.value,
                    label: btn.label,
                },
                React.createElement('RNPText', null, btn.label)
            )
        );
        return React.createElement('RNPSegmentedButtons', { testID: 'segmented-buttons', value, ...rest }, items);
    };

    return { Provider, Button, Text, TextInput, HelperText, Snackbar, SegmentedButtons, Menu, Chip, MD3LightTheme };
});

// Mock expo-updates to avoid ESM import issues in tests
jest.mock('expo-updates', () => ({
    __esModule: true,
    default: {},
    reloadAsync: async () => {},
    checkForUpdateAsync: async () => ({ isAvailable: false }),
    fetchUpdateAsync: async () => ({}),
    installUpdate: () => {},
}));
