import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models';

// Definir variáveis de ambiente ANTES de importar o app
process.env.MAX_FILES_PER_UPLOAD = '6';
process.env.MAX_FILE_SIZE = '104857600';

// Importar app após as variáveis de ambiente (usando require para evitar hoisting do import)
const app = require('../app').default;

// Mock do Cloudinary para não fazer chamadas reais à API
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        setTimeout(() => {
          callback(null, {
            public_id: options.public_id || 'test_id',
            secure_url: 'https://cloudinary.com/test.mp4',
            bytes: 1000,
            resource_type: options.resource_type || 'video',
          });
        }, 10);
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
    api: {
      resources: jest.fn().mockResolvedValue({ resources: [] }),
      resource: jest.fn().mockResolvedValue({}),
    }
  },
}));

// Mock do logger para não sujar a saída do teste
jest.mock('../utils/logger', () => {
  const mockLoggerInstance = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    http: jest.fn(),
    debug: jest.fn(),
  };

  return {
    __esModule: true,
    logger: mockLoggerInstance,
    default: mockLoggerInstance,
    requestLogger: (req: any, res: any, next: any) => next(),
    loggerUtils: {
      logError: jest.fn(),
      logRequest: jest.fn(),
      logAuth: jest.fn(),
      logUpload: jest.fn(),
      logDatabase: jest.fn(),
    }
  };
});

describe('Verificação de Upload de 6 Vídeos de 20 segundos', () => {
  let mongo: MongoMemoryServer;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Criar um usuário prestador (apenas prestadores podem criar ofertas)
    const user = new User({
      nome: 'Prestador de Teste',
      email: `prestador_${Date.now()}@example.com`,
      senha: 'password123',
      tipo: 'prestador',
      tipoPessoa: 'PF',
      cpf: Math.floor(Math.random() * 100000000000).toString().padStart(11, '0')
    });
    await user.save();
    userId = user._id.toString();

    // Login para obter token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123'
      });
    
    token = loginRes.body.data.token;
  }, 20000);

  it('deve permitir o upload simultâneo de 6 arquivos de vídeo', async () => {
    const req = request(app)
      .post('/api/upload/files')
      .set('Authorization', `Bearer ${token}`);

    // Adicionar 6 arquivos de vídeo "falsos"
    // Simulamos vídeos de 20 segundos com buffers de tamanho razoável (embora o conteúdo seja fake)
    for (let i = 1; i <= 6; i++) {
      req.attach('files', Buffer.from('fake-video-data-'.repeat(100)), {
        filename: `video_20s_${i}.mp4`,
        contentType: 'video/mp4',
      });
    }

    const res = await req.expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.files).toHaveLength(6);
    
    res.body.data.files.forEach((file: any) => {
      expect(file.resourceType).toBe('video');
      expect(file.url).toContain('.mp4');
    });
  });

  it('deve permitir a criação de uma Oferta de Serviço com 6 URLs de vídeos', async () => {
    const ofertaData = {
      titulo: 'Desenvolvedor Full Stack Especialista',
      descricao: 'Ofereço serviços de desenvolvimento com 6 vídeos demonstrativos do meu portfólio.',
      preco: 150,
      unidadePreco: 'hora',
      categoria: 'Tecnologia',
      localizacao: {
        cidade: 'São Paulo',
        estado: 'SP',
        endereco: 'Av. Paulista, 1000'
      },
      videos: [
        'https://cloudinary.com/v1.mp4',
        'https://cloudinary.com/v2.mp4',
        'https://cloudinary.com/v3.mp4',
        'https://cloudinary.com/v4.mp4',
        'https://cloudinary.com/v5.mp4',
        'https://cloudinary.com/v6.mp4'
      ]
    };

    const res = await request(app)
      .post('/api/ofertas')
      .set('Authorization', `Bearer ${token}`)
      .send(ofertaData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.videos).toHaveLength(6);
    expect(res.body.data.titulo).toBe(ofertaData.titulo);
  }, 30000);

  it('deve falhar se tentar fazer upload de 7 vídeos (limite máximo)', async () => {
    const req = request(app)
      .post('/api/upload/files')
      .set('Authorization', `Bearer ${token}`);

    for (let i = 1; i <= 7; i++) {
      req.attach('files', Buffer.from('fake-video-data'), {
        filename: `video_${i}.mp4`,
        contentType: 'video/mp4',
      });
    }

    // O Multer deve retornar erro de limite de arquivos
    const res = await req.expect(400); // Ou 500 dependendo de como o erro é capturado, mas geralmente 400 ou capturado pelo error handler
    
    // Se o erro for do Multer (LIMIT_FILE_COUNT), a mensagem costuma conter 'Too many files'
    // Mas vamos ver como o seu app-lite lida com isso.
  });
});
