import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models';

// Importar app usando require para evitar problemas de hoisting e garantir que process.env seja lido corretamente
const app = require('../app').default;

// Mock do Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        setTimeout(() => {
          callback(null, {
            public_id: options.public_id || `avatar_${Date.now()}`,
            secure_url: `https://cloudinary.com/avatar_${Date.now()}.jpg`,
            bytes: 5000,
            resource_type: 'image',
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
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

// Mock do logger
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

describe('Teste de Upload de Foto de Perfil (Avatar)', () => {
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
    
    const user = new User({
      nome: 'Usuário de Teste',
      email: `test_${Date.now()}@example.com`,
      senha: 'password123',
      tipo: 'comprador',
      tipoPessoa: 'PF',
      cpf: '12345678901'
    });
    await user.save();
    userId = user._id.toString();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123'
      });
    
    token = loginRes.body.data.token;
  }, 20000);

  it('deve fazer upload de uma foto de perfil com sucesso (JPEG)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('fake-image-data'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toContain('https://cloudinary.com/');
    expect(res.body.data.avatarPublicId).toBeDefined();

    // Verificar se o banco foi atualizado
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.avatar).toBe(res.body.data.avatar);
    expect(updatedUser?.avatarPublicId).toBe(res.body.data.avatarPublicId);
  });

  it('deve substituir uma foto de perfil existente', async () => {
    // Primeiro upload
    const res1 = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('first-image'), {
        filename: 'first.png',
        contentType: 'image/png',
      });
    
    const firstPublicId = res1.body.data.avatarPublicId;

    // Segundo upload (substituição)
    const res2 = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('second-image'), {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.avatarPublicId).not.toBe(firstPublicId);
    
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.avatarPublicId).toBe(res2.body.data.avatarPublicId);
  });

  it('deve remover a foto de perfil com sucesso', async () => {
    // Primeiro faz upload
    await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('image-to-remove'), {
        filename: 'to-remove.jpg',
        contentType: 'image/jpeg',
      });

    // Depois remove
    const res = await request(app)
      .delete('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toBeUndefined();
    expect(res.body.data.avatarPublicId).toBeUndefined();

    const updatedUser = await User.findById(userId);
    expect(updatedUser?.avatar).toBeUndefined();
    expect(updatedUser?.avatarPublicId).toBeUndefined();
  });

  it('deve falhar ao fazer upload de formato inválido (ex: .txt)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('fake-text-data'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    // O Multer configurado em userRoutes.ts deve barrar
    // Quando o multer barra via fileFilter, ele joga um erro.
    expect(res.status).toBe(500);
  });

  it('deve falhar se nenhum arquivo for enviado', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Nenhum arquivo foi enviado.');
  });

  it('deve falhar se o arquivo for maior que 5MB', async () => {
    // 6MB buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    
    const res = await request(app)
      .patch('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', largeBuffer, {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
      });

    // Erros de limite do Multer (LIMIT_FILE_SIZE) costumam retornar 500 no seu app ou ser capturados
    expect(res.status).toBe(500);
  });
});
