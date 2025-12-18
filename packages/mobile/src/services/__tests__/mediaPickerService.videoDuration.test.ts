import { Alert } from 'react-native';

// Mock do expo-image-picker para controlar retornos
jest.mock('expo-image-picker', () => {
  return {
    __esModule: true,
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    launchCameraAsync: jest.fn(),
  };
});

import * as ImagePicker from 'expo-image-picker';
import { recordVideo } from '../mediaPickerService';

describe('mediaPickerService - validação de duração de vídeo', () => {
  const buildAsset = (duration: number) => ({
    uri: 'file:///video.mp4',
    fileName: 'video.mp4',
    type: 'video',
    mimeType: 'video/mp4',
    fileSize: 1024,
    duration,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert as any).alert = jest.fn();
  });

  it('aceita vídeo de 10s quando provider retorna duração em milissegundos (10000ms)', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [buildAsset(10000)], // 10s em ms
    });

    const res = await recordVideo([]);
    expect(res.warnings).toEqual([]);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].name).toBe('video.mp4');
  });

  it('aceita vídeo de 20.5s por tolerância de metadados (20500ms)', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [buildAsset(20500)],
    });

    const res = await recordVideo([]);
    expect(res.warnings).toEqual([]);
    expect(res.files).toHaveLength(1);
  });

  it('rejeita vídeo acima de 20.5s (ex.: 21s = 21000ms) com aviso', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [buildAsset(21000)],
    });

    const res = await recordVideo([]);
    expect(res.files).toHaveLength(0);
    expect(res.warnings.join(' ')).toMatch(/excede 20 segundos/);
  });
});
