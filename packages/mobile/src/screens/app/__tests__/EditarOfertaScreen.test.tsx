import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mocks de serviços
jest.mock('@/services/ofertaService', () => ({
  ofertaService: {
    updateOferta: jest.fn(),
  },
}));

jest.mock('@/services/uploadService', () => ({
  uploadFiles: jest.fn(async () => ({ images: [], videos: [] })),
}));

jest.mock('@/hooks/useMediaPicker', () => ({
  useMediaPicker: jest.fn(() => ({
    pickFromGallery: jest.fn(),
    takePhoto: jest.fn(),
  })),
}));

jest.mock('@/hooks/useOfertaOptions', () => ({
  useOfertaOptions: jest.fn(() => ({
    categoryOptions: [],
    subcategoryOptions: [],
    stateOptions: [],
  })),
}));

// Importar a tela APÓS os mocks
import EditarOfertaScreen from '@/screens/app/EditarOfertaScreen';
import { Alert } from 'react-native';

// Mock do navigation
const mockNavigation = {
  replace: jest.fn(),
  goBack: jest.fn(),
} as any;

const mockOferta = {
  _id: '123',
  titulo: 'Oferta Original',
  descricao: 'Descricao Original',
  preco: 100,
  unidadePreco: 'hora',
  categoria: 'tecnologia',
  localizacao: {
    cidade: 'São Paulo',
    estado: 'SP',
  },
  imagens: [],
  videos: [],
};

const mockRoute = {
  params: {
    oferta: mockOferta,
  },
} as any;

describe('EditarOfertaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  it('deve renderizar com os dados iniciais da oferta', () => {
    const { getByDisplayValue, getByText } = render(
      <EditarOfertaScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByDisplayValue('Oferta Original')).toBeTruthy();
    expect(getByDisplayValue('Descricao Original')).toBeTruthy();
    expect(getByDisplayValue('R$ 100,00')).toBeTruthy();
    expect(getByText('São Paulo')).toBeTruthy();
    expect(getByText('SP')).toBeTruthy();
  });

  it('deve chamar ofertaService.updateOferta ao salvar alterações', async () => {
    (ofertaService.updateOferta as jest.Mock).mockResolvedValue({ ...mockOferta, titulo: 'Oferta Editada' });

    const { getByLabelText, getByText } = render(
      <EditarOfertaScreen navigation={mockNavigation} route={mockRoute} />
    );

    const tituloInput = getByLabelText('Título');
    fireEvent.changeText(tituloInput, 'Oferta Editada');

    const salvarBtn = getByText('Salvar Alterações');
    fireEvent.press(salvarBtn);

    await waitFor(() => {
      expect(ofertaService.updateOferta).toHaveBeenCalledWith('123', expect.objectContaining({
        titulo: 'Oferta Editada',
      }));
    });

    expect(Alert.alert).toHaveBeenCalledWith('Sucesso', 'Oferta atualizada com sucesso!');
    expect(mockNavigation.replace).toHaveBeenCalledWith('OfferDetail', { oferta: expect.objectContaining({ titulo: 'Oferta Editada' }) });
  });

  it('deve exibir erro se a atualização falhar', async () => {
    (ofertaService.updateOferta as jest.Mock).mockRejectedValue(new Error('Falha na API'));

    const { getByText } = render(
      <EditarOfertaScreen navigation={mockNavigation} route={mockRoute} />
    );

    const salvarBtn = getByText('Salvar Alterações');
    fireEvent.press(salvarBtn);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Falha na API');
    });
  });
});
