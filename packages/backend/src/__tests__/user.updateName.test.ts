import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';

describe('User - update name', () => {
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
      nome: 'Nome Original',
      email: 'user@example.com',
      senha: 'password123',
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

  it('should update name with valid payload', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/nome')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo Nome' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nome).toBe('Novo Nome');

    const dbUser = await User.findById(userId);
    expect(dbUser?.nome).toBe('Novo Nome');
  });

  it('should reject invalid name (too short)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/nome')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'A' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors?.[0]?.message).toMatch(/mínimo 3/);
  });

  it('should reject when unauthenticated', async () => {
    await request(app)
      .patch('/api/v1/users/me/nome')
      .send({ nome: 'Novo Nome' })
      .expect(401);
  });
});

