import { uploadFile } from '../uploadService';
import { v2 as cloudinary } from 'cloudinary';

// Mock do logger para não sujar a saída do teste
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        // Armazena as opções para verificação no teste
        (cloudinary.uploader.upload_stream as any).lastOptions = options;
        
        // Simula o comportamento de sucesso chamando o callback após um "tick"
        setTimeout(() => {
          callback(null, {
            public_id: options.public_id || 'test_id',
            secure_url: 'https://cloudinary.com/test.mp4',
            bytes: 1000,
            resource_type: options.resource_type || 'video',
          });
        }, 10);

        // Retorna um objeto que simula um writable stream (tem o método pipe)
        return {
          on: jest.fn().mockReturnThis(),
          once: jest.fn().mockReturnThis(),
          emit: jest.fn().mockReturnThis(),
          write: jest.fn().mockReturnThis(),
          end: jest.fn().mockReturnThis(),
          pipe: jest.fn().mockReturnThis(),
        };
      }),
    },
  },
}));

describe('uploadService (Backend) - Conversão para MP4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (cloudinary.uploader.upload_stream as any).lastOptions;
  });

  it('deve incluir format: "mp4" ao fazer upload de um vídeo MOV (video/quicktime)', async () => {
    const mockFile = {
      buffer: Buffer.from('fake-video-content'),
      mimetype: 'video/quicktime',
      originalname: 'test-video.mov',
    } as Express.Multer.File;

    const userId = 'user-123';
    
    await uploadFile(mockFile, userId);

    const lastOptions = (cloudinary.uploader.upload_stream as any).lastOptions;
    
    expect(lastOptions).toBeDefined();
    expect(lastOptions.resource_type).toBe('video');
    // Agora a conversão é feita via eager transformation assíncrona para suportar vídeos grandes
    expect(lastOptions.eager).toBeDefined();
    expect(lastOptions.eager[0].format).toBe('mp4');
    expect(lastOptions.eager_async).toBe(true);
    expect(lastOptions.folder).toBe(`app-lite/${userId}`);
  });

  it('não deve incluir format: "mp4" ao fazer upload de uma imagem', async () => {
    const mockFile = {
      buffer: Buffer.from('fake-image-content'),
      mimetype: 'image/png',
      originalname: 'test-image.png',
    } as Express.Multer.File;

    const userId = 'user-123';
    
    await uploadFile(mockFile, userId);

    const lastOptions = (cloudinary.uploader.upload_stream as any).lastOptions;
    
    expect(lastOptions).toBeDefined();
    expect(lastOptions.resource_type).toBe('image');
    expect(lastOptions.format).toBeUndefined();
  });
});
