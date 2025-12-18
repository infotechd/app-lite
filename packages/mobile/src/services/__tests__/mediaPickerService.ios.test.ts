import * as ImagePicker from 'expo-image-picker';

// Mock do Platform para ser iOS sempre neste arquivo
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((dict) => dict.ios),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock do expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(),
}));

describe('mediaPickerService - iPhone/MOV verification', () => {
  // Importamos aqui para garantir que ele pegue os mocks
  let pickVideo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Forçamos o reload do módulo para garantir que PLATFORM_ALLOWED_TYPES em validation.ts
    // seja recalculado com Platform.OS === 'ios'
    jest.isolateModules(() => {
        pickVideo = require('../mediaPickerService').pickVideo;
    });
  });

  it('deve aceitar arquivo MOV quando o usuário está no iOS', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///gallery/video.mov',
          fileName: 'video.mov',
          type: 'video',
          fileSize: 50 * 1024 * 1024, // 50MB
          duration: 15,
        },
      ],
    });

    const result = await pickVideo([]);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].type).toBe('video/quicktime');
    expect(result.warnings).toHaveLength(0);
  });
});
