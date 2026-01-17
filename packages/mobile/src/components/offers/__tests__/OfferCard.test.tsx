import React from 'react';
import { StyleSheet, View, Text as RNText, TouchableOpacity } from 'react-native';

// Polyfill StyleSheet.flatten antes de qualquer outra coisa
if (typeof StyleSheet.flatten !== 'function') {
  Object.defineProperty(StyleSheet, 'flatten', {
    value: (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s),
    writable: true,
    configurable: true,
  });
}

// Mocks para evitar erros de módulos nativos e simplificar UI
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/utils/analytics', () => ({
  trackCardClick: jest.fn(),
}));

jest.mock('@/utils/currency', () => ({
  formatCurrencyBRL: jest.fn((val) => `R$ ${val}`),
}));

jest.mock('@/utils/mediaUrl', () => ({
  toAbsoluteMediaUrl: jest.fn((url) => url ? `https://media.com/${url}` : null),
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  
  const Text = ({ children, accessibilityLabel, style }: any) => (
    <RNText accessibilityLabel={accessibilityLabel} style={style}>
      {children}
    </RNText>
  );

  const Chip = ({ children, icon, style, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={style} accessibilityRole="button">
      <View>{icon}</View>
      <Text>{children}</Text>
    </TouchableOpacity>
  );

  const CardRoot = ({ children, onPress, accessibilityLabel, accessibilityHint, accessibilityRole, testID }: any) => (
    <TouchableOpacity 
      onPress={onPress} 
      accessibilityLabel={accessibilityLabel} 
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole || 'button'}
      testID={testID || 'paper-card'}
    >
      <View>{children}</View>
    </TouchableOpacity>
  );

  const CardContent = ({ children }: any) => <View>{children}</View>;

  return {
    Card: Object.assign(CardRoot, { Content: CardContent }),
    Text,
    Chip,
  };
});

import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { trackCardClick } from '@/utils/analytics';
import { OfferCard } from '../OfferCard';

const mockNavigate = jest.fn();

const mockItem = {
  id: 'off1',
  titulo: 'Serviço de Limpeza',
  descricao: 'Limpeza completa residencial',
  preco: 100,
  unidadePreco: 'hora' as const,
  categoria: 'Limpeza',
  prestador: {
    id: 'p1',
    nome: 'Maria Silva',
    avaliacao: 4.8,
    avaliacoesCount: 15,
  },
  localizacao: {
    cidade: 'São Paulo',
    estado: 'SP',
  },
  imagens: ['img1.jpg'],
  distancia: 1500, // 1.5 km
} as any;

describe('OfferCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(cleanup);

  it('deve renderizar os dados básicos da oferta corretamente', () => {
    const { getByText } = render(<OfferCard item={mockItem} />);

    expect(getByText('Serviço de Limpeza')).toBeTruthy();
    expect(getByText('R$ 100/hora')).toBeTruthy();
    expect(getByText('Maria Silva')).toBeTruthy();
    expect(getByText('4.8 (15)')).toBeTruthy();
    expect(getByText('São Paulo, SP')).toBeTruthy();
    expect(getByText('Limpeza')).toBeTruthy();
    expect(getByText('1.5 km')).toBeTruthy();
  });

  it('deve formatar distância em metros se menor que 1km', () => {
    const itemMetros = { ...mockItem, distancia: 500 };
    const { getByText } = render(<OfferCard item={itemMetros} />);
    expect(getByText('500 m')).toBeTruthy();
  });

  it('deve chamar onPress se fornecido', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(<OfferCard item={mockItem} onPress={onPressMock} />);
    
    const card = getByTestId('paper-card');
    fireEvent.press(card);

    expect(onPressMock).toHaveBeenCalledWith(mockItem);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(trackCardClick).not.toHaveBeenCalled();
  });

  it('deve navegar para OfferDetail e trackear clique se onPress não for fornecido', () => {
    const { getByTestId } = render(<OfferCard item={mockItem} />);
    
    const card = getByTestId('paper-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith('OfferDetail', { oferta: mockItem });
    expect(trackCardClick).toHaveBeenCalledWith('off1', expect.any(Object));
  });

  it('deve lidar com dados faltantes graciosamente (defensive logic)', () => {
    const itemIncompleto = {
      titulo: 'Título',
    } as any;

    const { getByText } = render(<OfferCard item={itemIncompleto} />);

    expect(getByText('Título')).toBeTruthy();
    expect(getByText('R$ 0')).toBeTruthy(); 
    expect(getByText('Prestador')).toBeTruthy(); 
    expect(getByText('0.0')).toBeTruthy(); 
    expect(getByText('Cidade, UF')).toBeTruthy();
  });

  it('deve ter as propriedades de acessibilidade corretas', () => {
    const { getByTestId } = render(<OfferCard item={mockItem} />);
    const card = getByTestId('paper-card');

    expect(card.props.accessibilityLabel).toContain('Oferta: Serviço de Limpeza');
    expect(card.props.accessibilityHint).toBe('Abre os detalhes da oferta');
  });
});
