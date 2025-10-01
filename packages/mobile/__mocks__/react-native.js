const React = require('react');

// Very lightweight mock of react-native for Jest tests running in Node env
// Provides Platform and basic primitives as simple passthrough components
const createElement = React.createElement;

function createStubComponent(name) {
  return function Stub(props) {
    const { children, ...rest } = props || {};
    return createElement(name, rest, children);
  };
}

const RN = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === 'Platform') {
        return { OS: 'android', select: (obj) => obj.android ?? obj.default };
      }
      if (prop === 'StyleSheet') {
        return { create: (styles) => styles };
      }
      // Common primitives used by libs/components
      if (
        ['View', 'Text', 'TextInput', 'ScrollView', 'SafeAreaView', 'Pressable', 'TouchableOpacity'].includes(
          String(prop)
        )
      ) {
        return createStubComponent(String(prop));
      }
      // Return a stub for anything else to avoid crashes
      return createStubComponent(String(prop));
    },
  }
);

module.exports = RN;
