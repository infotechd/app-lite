import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// Polyfill for StyleSheet.flatten used by @testing-library/react-native formatters in this Jest env
// Some RN test setups don't include flatten; provide a noop version to stabilize tests
// @ts-ignore
if (typeof StyleSheet.flatten !== 'function') {
  // @ts-ignore
  StyleSheet.flatten = (s: any) => s;
}
// Garanta também no módulo raiz usado internamente pela testing-library
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  if (typeof RN.StyleSheet.flatten !== 'function') {
    RN.StyleSheet.flatten = (s: any) => s;
  }
} catch {}
// Import the screen after mocks are set up (see below)
import { ofertaService } from '@/services/ofertaService';
// Provider is not required since we mock all components from react-native-paper in this test
// import { Provider as PaperProvider } from 'react-native-paper';

// Mocks essenciais do app
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
// Ícones do Expo (MaterialCommunityIcons) — renderiza um placeholder simples
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Retorna um componente funcional simples que não depende do ambiente nativo
  return function MCIcon() { return React.createElement(View, null); };
});

jest.useFakeTimers();

jest.mock('@/services/ofertaService');
const mockGet = (ofertaService.getOfertas as unknown) as jest.Mock;

function advanceDebounce() {
  act(() => { jest.advanceTimersByTime(400); });
}

// Render helper para envolver com PaperProvider (necessário para componentes do react-native-paper)
function renderWithProviders(ui: React.ReactElement) {
  // We return the UI directly because react-native-paper components are mocked below.
  return render(ui);
}

// Evita renderizar o modal complexo do Paper nos testes
jest.mock('@/components/FiltersModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => null,
  };
});

// Mock simplificado do react-native-paper para evitar dependências de UI complexas no ambiente de teste
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TextInput, TouchableOpacity } = require('react-native');
  const Provider = ({ children }: any) => React.createElement(View, null, children);
  const Text = ({ children, ...props }: any) => React.createElement(RNText, props, children);
  const Button = ({ children, onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props }, children);
  const IconButton = ({ onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props });
  const Chip = ({ children, onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props }, children);
  const Searchbar = ({ value, onChangeText, onSubmitEditing, ...props }: any) => React.createElement(TextInput, { value, onChangeText, onSubmitEditing, accessibilityLabel: 'Buscar serviços', ...props });
  const CardRoot = ({ children, onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, ...props }, React.createElement(View, null, children));
  const CardContent = ({ children, ...props }: any) => React.createElement(View, props, children);
  const Card = Object.assign(CardRoot, { Content: CardContent });
  const FAB = ({ onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props });
  const Portal = ({ children }: any) => React.createElement(View, null, children);
  const MenuRoot = ({ children, anchor }: any) => React.createElement(View, null, [anchor, children]);
  const MenuItem = ({ title, onPress, leadingIcon, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props }, React.createElement(RNText, null, title));
  const Menu = Object.assign(MenuRoot, { Item: MenuItem });
  const Snackbar = ({ children, action, ...props }: any) => React.createElement(
    View,
    { accessibilityLabel: children, ...props },
    [
      React.createElement(RNText, { key: 'c' }, children),
      action ? React.createElement(TouchableOpacity, { key: 'a', onPress: action.onPress, accessibilityRole: 'button' }, React.createElement(RNText, null, action.label)) : null,
    ]
  );
  const List = {
    Item: ({ title, onPress, left, right, ...props }: any) => React.createElement(TouchableOpacity, { onPress, accessibilityRole: 'button', ...props }, [left ? left({}) : null, React.createElement(RNText, { key: 't' }, title), right ? right({}) : null]),
    Icon: () => React.createElement(View, null),
  };
  return { Provider, Text, Button, IconButton, Chip, Searchbar, Card, FAB, Portal, Menu, Snackbar, List };
});

// IMPORTANT: Import the screen AFTER setting up all mocks above
// to ensure it picks up the mocked modules instead of real ones
const BuscarOfertasScreen = require('@/screens/app/BuscarOfertasScreen').default;

describe('BuscarOfertasScreen - comportamento da lista', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('carrega primeira página após debounce da busca', async () => {
    mockGet
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'Pintor', preco: 100, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const utils = renderWithProviders(<BuscarOfertasScreen />);

    // 1ª carga inicial
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    // aguarda o Searchbar estar no tree e então digita
    const input = await utils.findByTestId('search-input');
    fireEvent.changeText(input, 'pintor');
    advanceDebounce();

    await utils.findByText('Pintor');
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('scroll (onEndReached) carrega próxima página', async () => {
    mockGet
      // página 1
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'P1', preco: 50, prestador: {}, localizacao: {} }], totalPages: 2, total: 2 })
      // página 2
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'P2', preco: 60, prestador: {}, localizacao: {} }], totalPages: 2, total: 2 });

    const utils = renderWithProviders(<BuscarOfertasScreen />);
    await utils.findByText('P1');
    const listEl = await utils.findByTestId('ofertas-list');

    act(() => {
      (listEl as any).props.onEndReached?.();
    });

    await findByText('P2');
  });

  it('refresh substitui itens e reseta para página 1', async () => {
    mockGet
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'Antigo', preco: 10, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 })
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'Novo', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const utils2 = renderWithProviders(<BuscarOfertasScreen />);
    await utils2.findByText('Antigo');

    act(() => {
      const list: any = (utils2.getByTestId as any)('ofertas-list');
      list.props.refreshControl.props.onRefresh();
    });

    await utils2.findByText('Novo');
    expect(utils2.queryByText('Antigo')).toBeNull();
  });

  it('erro mostra Snackbar e retry refaz a chamada', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'OK', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const utils = renderWithProviders(<BuscarOfertasScreen />);

    // Aguarda o texto do erro no Snackbar
    await utils.findByText('Não foi possível carregar as ofertas. Verifique sua conexão e tente novamente.');
    fireEvent.press(utils.getByText('Tentar novamente'));

    await utils.findByText('OK');
  });

  it('múltiplas mudanças rápidas abortam a anterior e ignoram resposta stale', async () => {
    let firstSignal: AbortSignal | undefined;
    mockGet
      .mockImplementationOnce((_f: any, _p: any, _l: any, signal: AbortSignal) => {
        firstSignal = signal;
        return new Promise(() => {}); // pendente, para simular requisição lenta
      })
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'Última', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const utils3 = renderWithProviders(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    const search = await utils3.findByTestId('search-input');
    fireEvent.changeText(search, 'x');
    advanceDebounce();

    await findByText('Última');
    expect(firstSignal?.aborted).toBe(true);
  });
});
