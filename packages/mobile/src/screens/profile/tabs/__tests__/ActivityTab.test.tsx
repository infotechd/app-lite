import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActivityTab from '@/screens/profile/tabs/ActivityTab';
import { StyleSheet } from 'react-native';

// Polyfill para StyleSheet.flatten usado internamente pela testing-library
// Garante compatibilidade em ambientes RN de teste
// @ts-ignore
if (typeof StyleSheet.flatten !== 'function') {
  // @ts-ignore
  StyleSheet.flatten = (s: any) => s;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  if (typeof RN.StyleSheet.flatten !== 'function') {
    RN.StyleSheet.flatten = (s: any) => s;
  }
} catch {}

// Evita dependências de Animated no Skeleton durante o teste
jest.mock('@/components/profile/skeletons/ActivityTabSkeleton', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="activity-skeleton" style={{ flex: 1 }} />;
});

describe('ActivityTab - Empty, Error and Retry flow', () => {
  it('mostra erro na primeira tentativa e vazio após retry', async () => {
    const screen = render(<ActivityTab />);

    // Deve exibir estado de erro (1ª tentativa simula erro)
    const error = await screen.findByTestId('activity-error');
    expect(error).toBeTruthy();

    // Clica em "Tentar novamente"
    const retryBtn = screen.getByTestId('activity-error-button');
    fireEvent.press(retryBtn);

    // Agora deve exibir estado vazio após retry
    const empty = await screen.findByTestId('activity-empty');
    expect(empty).toBeTruthy();
  });
});
