import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';

describe('User - update phone', () => {
  let mongo: MongoMemoryServer;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const user = await User.create({
      nome: 'Usuário Teste',
      email: 'user@example.com',
      senha: 'password123',
      tipo: 'comprador',
      tipoPessoa: 'PF',
      cpf: '12345678901'
    });
    userId = String((user as any).id ?? (user as any)._id);

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    token = loginRes.body.data.token;
  });

  it('should update phone with valid payload', async () => {
    const validPhone = '(11) 99999-9999';
    const res = await request(app)
      .patch('/api/v1/users/me/telefone')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefone: validPhone })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.telefone).toBe(validPhone);

    const dbUser = await User.findById(userId);
    expect(dbUser?.telefone).toBe(validPhone);
  });

  it('should reject invalid phone format', async () => {
    const invalidPhone = '11999999999'; // missing mask
    const res = await request(app)
      .patch('/api/v1/users/me/telefone')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefone: invalidPhone })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject when unauthenticated', async () => {
    await request(app)
      .patch('/api/v1/users/me/telefone')
      .send({ telefone: '(11) 99999-9999' })
      .expect(401);
  });
});
