import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet, View, Text as RNText, TextInput as RNTextInput, TouchableOpacity, Switch as RNSwitch } from 'react-native';
import { ofertaService } from '@/services/ofertaService';

// Polyfills e Mocks básicos
try {
  const RN = require('react-native');
  if (!RN.StyleSheet) RN.StyleSheet = {};
  RN.StyleSheet.flatten = (s: any) => {
    if (Array.isArray(s)) return Object.assign({}, ...s);
    return s || {};
  };
} catch {}

// Mock react-native
jest.mock('react-native', () => {
  const ActualRN = jest.requireActual('react-native');
  ActualRN.StyleSheet.flatten = (s: any) => {
    if (Array.isArray(s)) return Object.assign({}, ...s);
    return s || {};
  };
  return ActualRN;
});

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, setPendingRedirect: jest.fn() }),
}));
jest.mock('@/navigation/RootNavigation', () => ({ openAuthModal: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@/utils/sentry', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn(() => ({ end: () => {} })),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MCIcon() { return React.createElement(View, null); };
});
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MIcon() { return React.createElement(View, null); };
});

// jest.useFakeTimers();

jest.mock('@/services/ofertaService');
const mockGet = (ofertaService.getOfertas as unknown) as jest.Mock;

// Mock robusto do react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TextInput: RNTextInput, TouchableOpacity } = require('react-native');
  
  const Provider = ({ children }: any) => React.createElement(View, null, children);
  const Text = ({ children, ...props }: any) => React.createElement(RNText, props, children);
  const Button = ({ children, onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, ...props }, children);
  const IconButton = ({ onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, ...props });
  const Chip = ({ children, onPress, onClose, ...props }: any) => React.createElement(View, { style: { flexDirection: 'row' } }, [
      React.createElement(TouchableOpacity, { key: 'p', onPress, ...props }, children),
      onClose ? React.createElement(TouchableOpacity, { key: 'c', onPress: onClose }, React.createElement(RNText, null, 'X')) : null
  ]);
  const Searchbar = ({ value, onChangeText, onSubmitEditing, ...props }: any) => React.createElement(RNTextInput, { value, onChangeText, onSubmitEditing, testID: 'search-input', ...props });
  const Card = ({ children, ...props }: any) => React.createElement(View, props, children);
  Card.Content = ({ children, ...props }: any) => React.createElement(View, props, children);
  const FAB = ({ onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, ...props });
  const Portal = ({ children }: any) => React.createElement(View, null, children);
  
  const Modal = ({ children, visible }: any) => visible ? React.createElement(View, { testID: 'paper-modal' }, children) : null;
  const Divider = () => React.createElement(View, { style: { height: 1 } });
  const TextInput = ({ label, value, onChangeText, ...props }: any) => React.createElement(View, null, [
      React.createElement(RNText, { key: 'l' }, label),
      React.createElement(RNTextInput, { key: 'i', value, onChangeText, ...props })
  ]);
  const HelperText = ({ children }: any) => React.createElement(RNText, null, children);
  
  const Switch = ({ value, onValueChange, ...props }: any) => {
    const { Switch: RNSwitch } = require('react-native');
    return React.createElement(RNSwitch, { value, onValueChange, ...props });
  };
  
  const SegmentedButtons = ({ value, onValueChange, buttons }: any) => {
    const { View, Text: RNText, TouchableOpacity } = require('react-native');
    return React.createElement(View, null, buttons.map((b: any) => 
      React.createElement(TouchableOpacity, { key: b.value, onPress: () => onValueChange(b.value) }, React.createElement(RNText, null, b.label))
    ));
  };

  const Menu = ({ children, visible, anchor }: any) => React.createElement(View, null, [anchor, visible ? children : null]);
  Menu.Item = ({ title, onPress }: any) => React.createElement(TouchableOpacity, { onPress }, React.createElement(RNText, null, title));

  const Snackbar = ({ children }: any) => React.createElement(View, null, children);
  const List = {
    Item: ({ title, onPress }: any) => React.createElement(TouchableOpacity, { onPress }, React.createElement(RNText, null, title)),
    Icon: () => React.createElement(View, null),
  };

  return { Provider, Text, Button, IconButton, Chip, Searchbar, Card, FAB, Portal, Modal, Divider, TextInput, HelperText, Switch, SegmentedButtons, Menu, Snackbar, List };
});

const BuscarOfertasScreen = require('@/screens/app/BuscarOfertasScreen').default;

function advanceDebounce() {
  act(() => { jest.advanceTimersByTime(400); });
}

describe('BuscarOfertasScreen - Filtros', () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockGet.mockResolvedValue({ ofertas: [], totalPages: 1, total: 0 });
  });

  it('aplica filtro de busca por texto', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<BuscarOfertasScreen />);
    
    const input = getByTestId('search-input');
    fireEvent.changeText(input, 'encanador');
    
    act(() => { jest.advanceTimersByTime(400); });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ busca: 'encanador' }),
      1, 10, expect.anything()
    ));
    jest.useRealTimers();
  });

  it('aplica filtro de categoria', async () => {
    jest.useFakeTimers();
    const { getByText, findByText } = render(<BuscarOfertasScreen />);
    
    // Abrir filtros
    fireEvent.press(getByText('Filtros'));

    // Selecionar categoria (DropdownPicker)
    fireEvent.press(getByText('Todas as categorias'));
    fireEvent.press(await findByText('Reformas e Reparos'));

    // Aplicar
    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'Reformas e Reparos' }),
      1, 10, expect.anything()
    ));
    jest.useRealTimers();
  });

  it('aplica filtro de preço', async () => {
    jest.useFakeTimers();
    const { getByText, getByLabelText } = render(<BuscarOfertasScreen />);

    fireEvent.press(getByText('Filtros'));

    fireEvent.changeText(getByLabelText('Mínimo'), '100');
    fireEvent.changeText(getByLabelText('Máximo'), '500');

    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ precoMin: 100, precoMax: 500 }),
      1, 10, expect.anything()
    ));
    jest.useRealTimers();
  });

  it('aplica filtro de localização (estado e cidade)', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Filtros'));

    // Adicionar estado
    fireEvent.press(getByText('Adicionar estado'));
    fireEvent.press(await findByText('São Paulo'));

    // Digitar cidade
    fireEvent.changeText(getByPlaceholderText('Digite a cidade'), 'Campinas');

    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'SP', cidade: 'Campinas' }),
      1, 10, expect.anything()
    ));
  });

  it('aplica múltiplos estados', async () => {
    const { getByText, findByText } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Filtros'));

    fireEvent.press(getByText('Adicionar estado'));
    fireEvent.press(await findByText('São Paulo'));
    
    fireEvent.press(getByText('Adicionar estado'));
    fireEvent.press(await findByText('Rio de Janeiro'));

    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ estado: ['SP', 'RJ'] }),
      1, 10, expect.anything()
    ));
  });

  it('aplica filtro de mídia e tipo de pessoa', async () => {
    const { getByText, getByLabelText } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Filtros'));

    // Switch de mídia
    fireEvent(getByLabelText('Apenas com fotos e vídeos'), 'onValueChange', true);

    // Tipo de pessoa
    fireEvent.press(getByText('Pessoa Jurídica'));

    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ comMidia: true, tipoPessoa: 'PJ' }),
      1, 10, expect.anything()
    ));
  });

  it('aplica ordenação', async () => {
    const { getByText, findByText } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    // Abrir menu de ordenação (padrão é "Mais Relevante")
    fireEvent.press(getByText('Mais Relevante'));

    // Selecionar "Menor Preço"
    fireEvent.press(await findByText('Menor Preço'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'preco_menor' }),
      1, 10, expect.anything()
    ));
  });

  it('limpa todos os filtros', async () => {
    const { getByText, getByLabelText } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Filtros'));
    fireEvent.changeText(getByLabelText('Mínimo'), '100');
    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ precoMin: 100 }),
      1, 10, expect.anything()
    ));

    // Abrir de novo e limpar
    fireEvent.press(getByText('Filtros (1)'));
    fireEvent.press(getByText('Limpar'));
    // O botão Limpar no modal chama onClear que limpa o draft e fecha o modal no screen? 
    // Não, no BuscarOfertasScreen.tsx:
    // const clearAllFilters = () => { ... setIsFiltersVisible(false); ... }
    
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ precoMin: undefined }),
      1, 10, expect.anything()
    ));
  });

  it('combinação complexa de filtros', async () => {
    const { getByText, getByLabelText, getByPlaceholderText, findByText, findByTestId } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    // Busca
    const input = await findByTestId('search-input');
    fireEvent.changeText(input, 'pintura');
    advanceDebounce();

    // Filtros modal
    fireEvent.press(getByText('Filtros'));
    
    fireEvent.press(getByText('Todas as categorias'));
    fireEvent.press(await findByText('Reformas e Reparos'));

    fireEvent.changeText(getByLabelText('Mínimo'), '50');
    
    fireEvent.press(getByText('Adicionar estado'));
    fireEvent.press(await findByText('Minas Gerais'));
    
    fireEvent.changeText(getByPlaceholderText('Digite a cidade'), 'Belo Horizonte');
    
    fireEvent(getByLabelText('Apenas com fotos e vídeos'), 'onValueChange', true);
    
    fireEvent.press(getByText('Pessoa Física'));

    fireEvent.press(getByText('Aplicar'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({
        busca: 'pintura',
        categoria: 'Reformas e Reparos',
        precoMin: 50,
        estado: 'MG',
        cidade: 'Belo Horizonte',
        comMidia: true,
        tipoPessoa: 'PF'
      }),
      1, 10, expect.anything()
    ));
  });
});
