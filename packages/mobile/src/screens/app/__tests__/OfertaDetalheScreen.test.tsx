import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mocks
jest.mock('@/services/ofertaService', () => ({
  ofertaService: {
    deleteOferta: jest.fn(),
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: jest.fn(() => ({})),
}));

// Importar a tela APÓS os mocks
import OfertaDetalheScreen from '@/screens/app/OfertaDetalheScreen';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { ofertaService } from '@/services/ofertaService';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

const mockOferta = {
  _id: '123',
  titulo: 'Oferta de Teste',
  descricao: 'Descrição de teste',
  preco: 150,
  unidadePreco: 'hora',
  categoria: 'Limpeza',
  prestador: {
    _id: 'user123',
    nome: 'João Silva',
    avaliacao: 4.5,
  },
  localizacao: {
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
  },
  imagens: [],
  videos: [],
};

const mockRoute = {
  params: {
    oferta: mockOferta,
  },
} as any;

describe('OfertaDetalheScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user123' },
    });
  });

  it('deve renderizar os detalhes da oferta', () => {
    const { getByText } = render(
      <OfertaDetalheScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Oferta de Teste')).toBeTruthy();
    expect(getByText('Descrição de teste')).toBeTruthy();
    expect(getByText('João Silva')).toBeTruthy();
  });

  it('deve mostrar botões de Editar e Excluir se o usuário for o dono', () => {
    const { getByText } = render(
      <OfertaDetalheScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Editar')).toBeTruthy();
    expect(getByText('Excluir')).toBeTruthy();
  });

  it('não deve mostrar botões de Editar e Excluir se o usuário não for o dono', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'otherUser' },
    });

    const { queryByText } = render(
      <OfertaDetalheScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(queryByText('Editar')).toBeNull();
    expect(queryByText('Excluir')).toBeNull();
  });

  it('deve chamar ofertaService.deleteOferta após confirmação no alerta', async () => {
    (ofertaService.deleteOferta as jest.Mock).mockResolvedValue({ success: true });

    const { getByText } = render(
      <OfertaDetalheScreen navigation={mockNavigation} route={mockRoute} />
    );

    const excluirBtn = getByText('Excluir');
    fireEvent.press(excluirBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Excluir oferta',
      expect.any(String),
      expect.any(Array)
    );

    // Simula o pressionamento do botão 'Excluir' no Alert
    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const deleteConfirmButton = alertButtons.find((b: any) => b.text === 'Excluir');
    
    await deleteConfirmButton.onPress();

    expect(ofertaService.deleteOferta).toHaveBeenCalledWith('123');
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Sucesso', 'Oferta excluída com sucesso.');
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
