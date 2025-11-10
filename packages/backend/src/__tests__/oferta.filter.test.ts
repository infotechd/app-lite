import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { OfertaServico } from '../models/OfertaServico';

// Helper to create a basic oferta document
async function seedOferta(params: {
  titulo: string;
  tipoPessoa: 'PF' | 'PJ';
  preco?: number;
  categoria?: string;
  cidade?: string;
  estado?: string;
}): Promise<void> {
  const {
    titulo,
    tipoPessoa,
    preco = 100,
    categoria = 'Tecnologia',
    cidade = 'Fortaleza',
    estado = 'CE',
  } = params;

  await OfertaServico.create({
    titulo,
    descricao: `${titulo} descricao`,
    preco,
    categoria,
    imagens: [],
    localizacao: {
      cidade,
      estado,
    },
    prestador: {
      _id: new mongoose.Types.ObjectId(),
      nome: `${titulo}-Prestador`,
      avaliacao: 4.5,
      tipoPessoa,
    },
    status: 'ativo',
  } as any);
}

describe('GET /api/ofertas - filtro tipoPessoa', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    // Limpa a coleção e popula dados de teste
    await OfertaServico.deleteMany({});
    await seedOferta({ titulo: 'Serviço PF', tipoPessoa: 'PF' });
    await seedOferta({ titulo: 'Serviço PJ', tipoPessoa: 'PJ' });
  });

  it('deve retornar PF e PJ quando nenhum filtro tipoPessoa for enviado', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .expect(200);

    expect(res.body?.success).toBe(true);
    const data = res.body?.data;
    expect(Array.isArray(data?.ofertas)).toBe(true);
    const titulos = data.ofertas.map((o: any) => o.titulo).sort();
    expect(titulos).toEqual(['Serviço PF', 'Serviço PJ'].sort());
  });

  it('deve retornar apenas ofertas de PF quando tipoPessoa=PF', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ tipoPessoa: 'PF' })
      .expect(200);

    expect(res.body?.success).toBe(true);
    const data = res.body?.data;
    expect(Array.isArray(data?.ofertas)).toBe(true);
    expect(data.ofertas.length).toBe(1);
    expect(data.ofertas[0].prestador?.tipoPessoa).toBe('PF');
    expect(data.ofertas[0].titulo).toBe('Serviço PF');
  });

  it('deve retornar apenas ofertas de PJ quando tipoPessoa=PJ', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ tipoPessoa: 'PJ' })
      .expect(200);

    expect(res.body?.success).toBe(true);
    const data = res.body?.data;
    expect(Array.isArray(data?.ofertas)).toBe(true);
    expect(data.ofertas.length).toBe(1);
    expect(data.ofertas[0].prestador?.tipoPessoa).toBe('PJ');
    expect(data.ofertas[0].titulo).toBe('Serviço PJ');
  });
});
