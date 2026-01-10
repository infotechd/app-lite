import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { OfertaServico } from '../models/OfertaServico';
import User from '../models/User';

// Helper to create user for prestador lookup
async function seedUser(nome: string, tipoPessoa: 'PF' | 'PJ' = 'PF') {
  const user = await User.create({
    nome,
    email: `${nome.toLowerCase().replace(/\s+/g, '')}@test.com`,
    senha: 'hashed',
    tipo: 'prestador',
    tipoPessoa,
  } as any);
  return user.toObject();
}

// Helper to create a basic oferta document
async function seedOferta(params: {
  titulo: string;
  tipoPessoa: 'PF' | 'PJ';
  preco?: number;
  categoria?: string;
  cidade?: string;
  estado?: string;
  buscaTerm?: string;
  lat?: number;
  lng?: number;
  userId?: string;
}): Promise<void> {
  const {
    titulo,
    tipoPessoa,
    preco = 100,
    categoria = 'Tecnologia',
    cidade = 'Fortaleza',
    estado = 'CE',
    buscaTerm,
    lat,
    lng,
    userId,
  } = params;

  const prestador = userId ? await User.findById(userId) : await seedUser(`${titulo}-User`, tipoPessoa);

  const coordsDefined = typeof lat === 'number' && typeof lng === 'number';

  await OfertaServico.create({
    titulo,
    descricao: `${buscaTerm || titulo} descricao`,
    preco,
    categoria,
    imagens: [],
    localizacao: {
      cidade,
      estado,
      ...(coordsDefined
        ? {
            coordenadas: { latitude: lat as number, longitude: lng as number },
            location: { type: 'Point', coordinates: [lng as number, lat as number] },
          }
        : {}),
    },
    prestador: {
      _id: prestador?._id || new mongoose.Types.ObjectId(),
      nome: prestador?.nome || `${titulo}-Prestador`,
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
    await User.deleteMany({});
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

  it('deve aplicar busca por texto junto com ordenação por distancia sem conflito com regex', async () => {
    const user = await seedUser('Geo User');
    await seedOferta({
      titulo: 'Pintor Centro',
      tipoPessoa: 'PF',
      buscaTerm: 'pintor',
      lat: -3.7319,
      lng: -38.5267,
      userId: String(user._id),
    });
    await seedOferta({
      titulo: 'Eletricista Longe',
      tipoPessoa: 'PF',
      buscaTerm: 'eletricista',
      lat: -3.75,
      lng: -38.6,
      userId: String(user._id),
    });

    const res = await request(app)
      .get('/api/ofertas')
      .query({
        busca: 'pintor',
        sort: 'distancia',
        lat: -3.7319,
        lng: -38.5267,
      })
      .expect(200);

    expect(res.body?.success).toBe(true);
    const ofertas = res.body?.data?.ofertas;
    expect(Array.isArray(ofertas)).toBe(true);
    expect(ofertas.length).toBe(1);
    expect(ofertas[0].titulo).toBe('Pintor Centro');
    expect(ofertas[0].prestador?.nome).toBeDefined();
  });

  it('deve ignorar array vazio em estado e ainda retornar resultados', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ estado: [] as any })
      .expect(200);

    expect(res.body?.success).toBe(true);
    const ofertas = res.body?.data?.ofertas;
    expect(ofertas.length).toBe(2);
  });

  it('deve validar coordenadas inválidas e retornar 400', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ sort: 'distancia', lat: 100, lng: 0 })
      .expect(400);

    expect(res.body?.success).toBe(false);
    expect(res.body?.message).toBe('Dados inválidos');
  });
});

describe('GET /api/ofertas - Validações e Correções de Bugs', () => {
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
    await OfertaServico.deleteMany({});
    await User.deleteMany({});
    await OfertaServico.create({
      titulo: 'Pintor em São Paulo',
      descricao: 'Serviços de pintura',
      preco: 150,
      categoria: 'Construção',
      localizacao: {
        cidade: 'São Paulo',
        estado: 'SP',
        location: { type: 'Point', coordinates: [-46.6333, -23.5505] },
      },
      prestador: {
        _id: new mongoose.Types.ObjectId(),
        nome: 'João Pintor',
        avaliacao: 4.8,
        tipoPessoa: 'PF',
      },
      status: 'ativo',
      tags: ['pintura', 'reforma'],
    } as any);
    await OfertaServico.create({
      titulo: 'Eletricista no Rio de Janeiro',
      descricao: 'Serviços elétricos',
      preco: 200,
      categoria: 'Construção',
      localizacao: {
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        location: { type: 'Point', coordinates: [-43.1729, -22.9068] },
      },
      prestador: {
        _id: new mongoose.Types.ObjectId(),
        nome: 'Maria Eletricista',
        avaliacao: 4.9,
        tipoPessoa: 'PF',
      },
      status: 'ativo',
      tags: ['eletrica', 'reforma'],
    } as any);
    await OfertaServico.syncIndexes();
  });

  it('deve retornar resultados ao filtrar com um array de estados vazio', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ estado: [] })
      .expect(200);
    expect(res.body.data.ofertas.length).toBeGreaterThan(0);
  });

  it('deve retornar erro 400 para latitude inválida', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({ sort: 'distancia', lat: 100, lng: -46 })
      .expect(400);
    expect(res.body.errors[0].message).toContain('Latitude inválida');
  });

  it('deve usar $text search consistentemente na busca por distância', async () => {
    const res = await request(app)
      .get('/api/ofertas')
      .query({
        sort: 'distancia',
        lat: -23.55,
        lng: -46.63,
        busca: 'pintura',
      })
      .expect(200);
    expect(res.body.data.ofertas.length).toBe(1);
    expect(res.body.data.ofertas[0].titulo).toBe('Pintor em São Paulo');
    expect(res.body.data.ofertas[0].prestador.nome).toBe('João Pintor');
  });
});
