import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';

describe('Auth Controller - Unificação de Perfis', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Teste: Cenário 1
  it('deve registrar um usuário sem o campo tipo no payload de resposta', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Usuário Teste',
        email: 'teste@example.com',
        password: 'senha123',
        tipoPessoa: 'PF',
        cpf: '123.456.789-09'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user).not.toHaveProperty('tipo');
    expect(response.body.data).toHaveProperty('token');
  });

  // Teste: Cenário 2
  it('deve ignorar o campo obsoleto tipo se enviado no registro', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Usuário Teste 2',
        email: 'teste2@example.com',
        password: 'senha123',
        tipoPessoa: 'PF',
        cpf: '123.456.789-09',
        tipo: 'prestador' // Campo obsoleto
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user).not.toHaveProperty('tipo');
  });

  // Teste Adicional: Perfil
  it('deve retornar um usuário sem o campo tipo no getProfile', async () => {
    // 1. Registro
    const regResponse = await request(app).post('/api/auth/register').send({
        nome: 'Profile User',
        email: 'profile@example.com',
        password: 'senha123',
        tipoPessoa: 'PF',
        cpf: '123.456.789-09'
    });
    const token = regResponse.body.data.token;

    // 2. Buscar Perfil
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).not.toHaveProperty('tipo');
  });

  // Teste: Cenário 3
  it('deve retornar um usuário sem o campo tipo no login', async () => {
    // 1. Criar usuário
    await request(app).post('/api/auth/register').send({
        nome: 'Login User',
        email: 'login@example.com',
        password: 'senha123',
        tipoPessoa: 'PF',
        cpf: '987.654.321-00'
    });

    // 2. Fazer login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'senha123',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user).not.toHaveProperty('tipo');
  });
});
