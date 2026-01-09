import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';
import { emailService } from '../services/emailService';

describe('User - update email', () => {
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
    jest.clearAllMocks();

    const user = await User.create({
      nome: 'User Test',
      email: 'original@example.com',
      senha: 'password123',
      tipo: 'comprador',
      tipoPessoa: 'PF',
      cpf: '12345678901'
    });
    userId = String((user as any).id ?? (user as any)._id);

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'original@example.com', password: 'password123' })
      .expect(200);

    token = loginRes.body.data.token;
  });

  it('should request email update successfully', async () => {
    const sendSpy = jest.spyOn(emailService, 'send').mockResolvedValue(undefined);

    const newEmail = 'new@example.com';
    const res = await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: newEmail, currentPassword: 'password123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Solicitação registrada/);
    expect(sendSpy).toHaveBeenCalled();
    
    const dbUser = await User.findById(userId);
    expect(dbUser?.pendingEmail).toBe(newEmail);
    expect(dbUser?.emailChangeToken).toBeDefined();
    expect(dbUser?.emailChangeExpires).toBeDefined();

    sendSpy.mockRestore();
  });

  it('should fail request with wrong password', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com', currentPassword: 'wrongpassword' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Senha atual incorreta/);
  });

  it('should fail request with email already in use', async () => {
    await User.create({
      nome: 'Another User',
      email: 'taken@example.com',
      senha: 'password123',
      tipo: 'comprador',
      tipoPessoa: 'PF',
      cpf: '98765432100'
    });

    const res = await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'taken@example.com', currentPassword: 'password123' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/já está em uso/);
  });

  it('should confirm email update successfully', async () => {
    jest.spyOn(emailService, 'send').mockResolvedValue(undefined);

    // 1. Request update to get token in DB
    const newEmail = 'new@example.com';
    await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: newEmail, currentPassword: 'password123' })
      .expect(200);

    const userBefore = await User.findById(userId);
    const changeToken = userBefore!.emailChangeToken;

    // 2. Confirm update
    const res = await request(app)
      .post('/api/v1/users/me/email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: changeToken })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/E-mail atualizado com sucesso/);

    const dbUser = await User.findById(userId);
    expect(dbUser?.email).toBe(newEmail);
    expect(dbUser?.pendingEmail).toBeUndefined();
    expect(dbUser?.emailChangeToken).toBeUndefined();

    // 3. Verify login with new email
    await request(app)
      .post('/api/auth/login')
      .send({ email: newEmail, password: 'password123' })
      .expect(200);
  });

  it('should fail confirmation with invalid token', async () => {
    jest.spyOn(emailService, 'send').mockResolvedValue(undefined);

    await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com', currentPassword: 'password123' })
      .expect(200);

    const res = await request(app)
      .post('/api/v1/users/me/email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'invalid-token' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Token inválido/);
  });

  it('should fail confirmation with expired token', async () => {
    jest.spyOn(emailService, 'send').mockResolvedValue(undefined);

    await request(app)
      .patch('/api/v1/users/me/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com', currentPassword: 'password123' })
      .expect(200);

    const userBefore = await User.findById(userId);
    const changeToken = userBefore!.emailChangeToken;

    // Manually expire the token in DB
    await User.findByIdAndUpdate(userId, {
      emailChangeExpires: new Date(Date.now() - 1000) // 1 second ago
    });

    const res = await request(app)
      .post('/api/v1/users/me/email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: changeToken })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Token expirado/);
    
    const dbUser = await User.findById(userId);
    expect(dbUser?.pendingEmail).toBeUndefined();
  });
});
