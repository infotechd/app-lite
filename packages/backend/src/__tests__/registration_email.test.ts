import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';
import { emailService } from '../services/emailService';

describe('Cadastro de Usuário - Envio de Email', () => {
  let mongo: MongoMemoryServer;

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
    jest.clearAllMocks();
  });

  const userData = {
    nome: 'User Test Email',
    email: 'test_email@example.com',
    password: 'password123',
    tipo: 'comprador',
    tipoPessoa: 'PF',
    cpf: '12345678902'
  };

  it('deve chamar o emailService.sendWelcomeEmail ao registrar um novo usuário', async () => {
    // Espionar o método sendWelcomeEmail
    // Usamos um mockImplementation para evitar o envio real/conexão com Ethereal
    const sendEmailSpy = jest.spyOn(emailService, 'sendWelcomeEmail').mockImplementation(async () => {
        return Promise.resolve();
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Verificar se o registro foi bem sucedido
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    
    // Verificar se o serviço de email foi chamado com o email e nome corretos
    // O controller chama: void emailService.sendWelcomeEmail(user.email, user.nome);
    expect(sendEmailSpy).toHaveBeenCalledWith(userData.email, userData.nome);
    
    sendEmailSpy.mockRestore();
  });

  it('não deve chamar o emailService.sendWelcomeEmail se o registro falhar (ex: email duplicado)', async () => {
    // 1. Criar um usuário inicial
    await new User({
        nome: 'Existing User',
        email: userData.email,
        senha: 'password123',
        tipo: 'comprador',
        tipoPessoa: 'PF',
        cpf: '00000000000'
    }).save();

    const sendEmailSpy = jest.spyOn(emailService, 'sendWelcomeEmail').mockImplementation(async () => {
        return Promise.resolve();
    });

    // 2. Tentar registrar com o mesmo email
    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    
    // 3. Verificar que o email NÃO foi enviado
    expect(sendEmailSpy).not.toHaveBeenCalled();
    
    sendEmailSpy.mockRestore();
  });
});
