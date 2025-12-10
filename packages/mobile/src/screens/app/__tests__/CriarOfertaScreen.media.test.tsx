import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mocks necessários antes de importar a tela
jest.mock('@/components/MediaOptionsMenu', () => {
  const React = require('react');
  const { View, Button } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPickPhoto, onPickVideo, onTakePhoto, onRecordVideo }: any) => (
      <View>
        <Button testID="menu-pick-photo" onPress={onPickPhoto} title="Escolher Foto" />
        <Button testID="menu-pick-video" onPress={onPickVideo} title="Escolher Vídeo" />
        <Button testID="menu-take-photo" onPress={onTakePhoto} title="Tirar Foto" />
        <Button testID="menu-record-video" onPress={onRecordVideo} title="Gravar Vídeo" />
      </View>
    ),
  };
});

jest.mock('@/services/uploadService', () => ({
  __esModule: true,
  uploadFiles: jest.fn(async () => ({ images: [], videos: [], raw: [] })),
}));

jest.mock('@/services/ofertaService', () => ({
  __esModule: true,
  ofertaService: { createOferta: jest.fn(async (p) => ({ id: '1', ...p })) },
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
}));

// Mock do serviço de mídia: vamos ajustar retorno por teste
jest.mock('@/services/mediaPickerService', () => ({
  __esModule: true,
  pickPhoto: jest.fn(),
  pickVideo: jest.fn(),
  takePhoto: jest.fn(),
  recordVideo: jest.fn(),
}));

import CriarOfertaScreen from '@/screens/app/CriarOfertaScreen';
import { pickPhoto, pickVideo } from '@/services/mediaPickerService';

const navMock = {
  replace: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe('CriarOfertaScreen - Galeria de Mídias', () => {
  const image1 = { uri: 'file:///img1.jpg', name: 'img1.jpg', type: 'image/jpeg' as const, size: 1024 };
  const image2 = { uri: 'file:///img2.png', name: 'img2.png', type: 'image/png' as const, size: 2048 };
  const video1 = { uri: 'file:///v1.mp4', name: 'v1.mp4', type: 'video/mp4' as const, size: 4096 };

  const renderScreen = () =>
    render(
      <CriarOfertaScreen
        navigation={navMock}
        route={{ key: 'CreateOferta', name: 'CreateOferta' } as any}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    // garantir Alert.alert como mock a cada teste
    ;(Alert as any).alert = jest.fn();
  });

  it('adiciona imagem ao escolher foto da galeria (sucesso)', async () => {
    (pickPhoto as jest.Mock).mockResolvedValue({ files: [image1], warnings: [] });

    const utils = renderScreen();

    // Escolhe foto diretamente via mock do menu
    fireEvent.press(utils.getByTestId('menu-pick-photo'));

    // Aguarda chip com nome da mídia
    await waitFor(() => expect(utils.getByText('img1.jpg')).toBeTruthy());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('exibe avisos ao escolher foto e ainda adiciona os arquivos', async () => {
    const alertSpy = (Alert as any).alert as jest.Mock;
    (pickPhoto as jest.Mock).mockResolvedValue({ files: [image2], warnings: ['Imagem acima de 10MB'] });

    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('menu-pick-photo'));

    await waitFor(() => expect(utils.getByText('img2.png')).toBeTruthy());
    expect(alertSpy).toHaveBeenCalledWith('Avisos', expect.stringContaining('Imagem acima de 10MB'));
  });

  it('não altera estado quando permissão é negada (galeria de fotos)', async () => {
    const alertSpy = (Alert as any).alert as jest.Mock;
    (pickPhoto as jest.Mock).mockResolvedValue({ files: [], warnings: [], permissionDenied: true });

    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('menu-pick-photo'));

    // Não deve encontrar nenhum chip com nomes adicionados
    await waitFor(() => expect(utils.queryByText('img1.jpg')).toBeNull());
    expect(alertSpy).toHaveBeenCalledWith('Permissão Negada', expect.any(String));
  });

  it('não altera estado quando limite é atingido (truncated)', async () => {
    const alertSpy = (Alert as any).alert as jest.Mock;
    (pickPhoto as jest.Mock).mockResolvedValue({ files: [], warnings: [], truncated: true });

    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('menu-pick-photo'));

    await waitFor(() => expect(utils.queryByText('img1.jpg')).toBeNull());
    expect(alertSpy).toHaveBeenCalledWith('Limite Atingido', expect.stringContaining('limite'));
  });

  it('adiciona vídeo ao escolher da galeria e mantém mídias existentes', async () => {
    // 1) Primeiro adiciona uma imagem
    (pickPhoto as jest.Mock).mockResolvedValue({ files: [image1], warnings: [] });
    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('menu-pick-photo'));
    await waitFor(() => expect(utils.getByText('img1.jpg')).toBeTruthy());

    // 2) Depois escolhe vídeo retornando a lista mesclada
    (pickVideo as jest.Mock).mockResolvedValue({ files: [image1, video1], warnings: [] });
    fireEvent.press(utils.getByTestId('menu-pick-video'));

    await waitFor(() => expect(utils.getByText('v1.mp4')).toBeTruthy());
  });
});
