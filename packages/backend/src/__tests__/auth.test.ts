import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';

describe('Auth Controller - Avatar fields', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  }, 60000); // Aumento do timeout para 60s

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  const userData = {
    nome: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    tipo: 'comprador',
    tipoPessoa: 'PF',
    cpf: '12345678901'
  };

  it('deve retornar os campos de avatar no login', async () => {
    // 1. Criar usuário e definir avatar diretamente no banco
    const user = new User({
      ...userData,
      senha: userData.password // No banco é 'senha'
    });
    user.avatar = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    user.avatarBlurhash = 'LEHV6nWB2yk8pyo0adRgeDRjRjWB';
    await user.save();

    // 2. Realizar login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    // 3. Verificar campos
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.avatar).toBe(user.avatar);
    expect(res.body.data.user.avatarBlurhash).toBe(user.avatarBlurhash);
  });

  it('deve retornar os campos de avatar no getProfile', async () => {
    // 1. Criar usuário e definir avatar
    const user = new User({
      ...userData,
      senha: userData.password
    });
    user.avatar = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    user.avatarBlurhash = 'LEHV6nWB2yk8pyo0adRgeDRjRjWB';
    await user.save();

    // 2. Login para obter token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    const token = loginRes.body.data.token;

    // 3. Recuperar perfil
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 4. Verificar campos
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.avatar).toBe(user.avatar);
    expect(res.body.data.user.avatarBlurhash).toBe(user.avatarBlurhash);
  });

  it('deve retornar os campos de avatar no register (mesmo se nulos)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('avatar');
    expect(res.body.data.user).toHaveProperty('avatarBlurhash');
  });
});
