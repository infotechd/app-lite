import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { OfertaServico } from '../models/OfertaServico';
import User from '../models/User';

/**
 * Helper para criar usuário e retornar token
 */
async function seedUser(nome: string, email: string) {
  const user = await User.create({
    nome,
    email,
    senha: 'password123',
    tipoPessoa: 'PF',
  } as any);
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' })
    .expect(200);
  return { user, token: loginRes.body.data.token };
}

async function seedOferta(ownerId: string, titulo: string) {
  return OfertaServico.create({
    titulo,
    descricao: `${titulo} desc`,
    preco: 100,
    unidadePreco: 'pacote',
    categoria: 'Tecnologia',
    localizacao: { cidade: 'SP', estado: 'SP' },
    prestador: {
      _id: new mongoose.Types.ObjectId(ownerId),
      nome: 'Owner',
      avaliacao: 5,
      tipoPessoa: 'PF',
    },
    status: 'ativo',
  } as any);
}

/**
 * Alguns middlewares populavam prestador._id, então garantimos que isso não
 * aconteça aqui e que a checagem de permissão use o _id real.
 */
describe('Permissões de oferta (update/delete/listByUser)', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    await OfertaServico.deleteMany({});
    await User.deleteMany({});
  });

  it('não deve permitir update por outro usuário mesmo se prestador._id vier populado', async () => {
    const { user: owner, token: ownerToken } = await seedUser('Owner', 'owner@test.com');
    const { user: intruso, token: intrusoToken } = await seedUser('Intruso', 'intruso@test.com');

    const oferta = await seedOferta(String(owner._id), 'Serviço A');

    // Popula manualmente para simular bug anterior
    const populated = await OfertaServico.findById(oferta._id).populate('prestador._id');
    expect(populated?.prestador?._id).toBeDefined();

    await request(app)
      .put(`/api/ofertas/${oferta._id}`)
      .set('Authorization', `Bearer ${intrusoToken}`)
      .send({ titulo: 'Hackeando' })
      .expect(403);

    // Dono ainda pode atualizar
    const resOwner = await request(app)
      .put(`/api/ofertas/${oferta._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ titulo: 'Atualizado' })
      .expect(200);

    expect(resOwner.body.data.titulo).toBe('Atualizado');
  });

  it('não deve permitir delete por outro usuário mesmo com prestador populado', async () => {
    const { user: owner, token: ownerToken } = await seedUser('Owner', 'owner2@test.com');
    const { token: intrusoToken } = await seedUser('Intruso', 'intruso2@test.com');

    const oferta = await seedOferta(String(owner._id), 'Serviço B');

    await OfertaServico.findById(oferta._id).populate('prestador._id');

    await request(app)
      .delete(`/api/ofertas/${oferta._id}`)
      .set('Authorization', `Bearer ${intrusoToken}`)
      .expect(403);

    // Dono consegue deletar
    await request(app)
      .delete(`/api/ofertas/${oferta._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('listByUser deve retornar apenas ofertas do usuário autenticado', async () => {
    const { user: owner, token: ownerToken } = await seedUser('Owner', 'owner3@test.com');
    const { user: other } = await seedUser('Other', 'other3@test.com');

    await seedOferta(String(owner._id), 'Serviço C');
    await seedOferta(String(other._id), 'Serviço D');

    const res = await request(app)
      .get('/api/ofertas/minhas')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.data.ofertas).toHaveLength(1);
    expect(res.body.data.ofertas[0].titulo).toBe('Serviço C');
  });
});

