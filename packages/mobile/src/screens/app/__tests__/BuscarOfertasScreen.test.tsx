import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react-native';
import BuscarOfertasScreen from '@/screens/app/BuscarOfertasScreen';
import { ofertaService } from '@/services/ofertaService';

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
  return ({ name }: any) => React.createElement('Icon', { name });
});

jest.useFakeTimers();

jest.mock('@/services/ofertaService');
const mockGet = (ofertaService.getOfertas as unknown) as jest.Mock;

function advanceDebounce() {
  act(() => { jest.advanceTimersByTime(400); });
}

describe('BuscarOfertasScreen - comportamento da lista', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('carrega primeira página após debounce da busca', async () => {
    mockGet
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'Pintor', preco: 100, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    render(<BuscarOfertasScreen />);

    // 1ª carga inicial
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    // digitar e esperar debounce
    fireEvent.changeText(screen.getByA11yLabel('Buscar serviços'), 'pintor');
    advanceDebounce();

    await screen.findByText('Pintor');
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('scroll (onEndReached) carrega próxima página', async () => {
    mockGet
      // página 1
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'P1', preco: 50, prestador: {}, localizacao: {} }], totalPages: 2, total: 2 })
      // página 2
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'P2', preco: 60, prestador: {}, localizacao: {} }], totalPages: 2, total: 2 });

    const { getByTestId } = render(<BuscarOfertasScreen />);
    await screen.findByText('P1');

    act(() => {
      getByTestId('ofertas-list').props.onEndReached?.();
    });

    await screen.findByText('P2');
  });

  it('refresh substitui itens e reseta para página 1', async () => {
    mockGet
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'Antigo', preco: 10, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 })
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'Novo', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const { getByTestId } = render(<BuscarOfertasScreen />);
    await screen.findByText('Antigo');

    act(() => {
      const list = getByTestId('ofertas-list');
      list.props.refreshControl.props.onRefresh();
    });

    await screen.findByText('Novo');
    expect(screen.queryByText('Antigo')).toBeNull();
  });

  it('erro mostra Snackbar e retry refaz a chamada', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce({ ofertas: [{ _id: '1', titulo: 'OK', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    render(<BuscarOfertasScreen />);

    const snack = await screen.findByA11yLabel('Não foi possível carregar as ofertas. Verifique sua conexão e tente novamente.');
    expect(snack).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));

    await screen.findByText('OK');
  });

  it('múltiplas mudanças rápidas abortam a anterior e ignoram resposta stale', async () => {
    let firstSignal: AbortSignal | undefined;
    mockGet
      .mockImplementationOnce((_f: any, _p: any, _l: any, signal: AbortSignal) => {
        firstSignal = signal;
        return new Promise(() => {}); // pendente, para simular requisição lenta
      })
      .mockResolvedValueOnce({ ofertas: [{ _id: '2', titulo: 'Última', preco: 20, prestador: {}, localizacao: {} }], totalPages: 1, total: 1 });

    const { getByA11yLabel } = render(<BuscarOfertasScreen />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.changeText(getByA11yLabel('Buscar serviços'), 'x');
    advanceDebounce();

    await screen.findByText('Última');
    expect(firstSignal?.aborted).toBe(true);
  });
});
