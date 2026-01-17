import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

// Polyfill StyleSheet.flatten if it's missing
if (typeof StyleSheet.flatten !== 'function') {
  (StyleSheet as any).flatten = (s: any) => s;
}

const { render } = require('@testing-library/react-native');

describe('Simple Test', () => {
  it('should render', () => {
    const { getByText } = render(<View><Text>Hello</Text></View>);
    expect(getByText('Hello')).toBeTruthy();
  });
});
