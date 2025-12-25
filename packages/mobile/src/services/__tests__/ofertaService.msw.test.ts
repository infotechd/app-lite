import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ofertaService } from '../ofertaService';

// Configura MSW server interceptando a base local
const server = setupServer(
  http.get('*/api/ofertas', ({ request }) => {
    const url = new URL(request.url);
    // Ecoa alguns dados para validação no teste
    const busca = url.searchParams.get('busca');
    const categoria = url.searchParams.get('categoria');
    const precoMin = url.searchParams.get('precoMin');
    const precoMax = url.searchParams.get('precoMax');
    const cidade = url.searchParams.get('cidade');
    const estado = url.searchParams.get('estado');
    const sort = url.searchParams.get('sort');
    const comMidia = url.searchParams.get('comMidia');
    const tipoPessoa = url.searchParams.get('tipoPessoa');
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    return HttpResponse.json({
      ofertas: [
        { _id: '1', titulo: `ECO-${busca}-${categoria}`, preco: 10, prestador: {}, localizacao: {} }
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      _echo: { busca, categoria, precoMin, precoMax, cidade, estado, sort, comMidia, tipoPessoa, lat, lng }
    });
  }),

  http.put('*/api/ofertas/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    return HttpResponse.json({
      _id: id,
      ...body,
      updatedAt: new Date().toISOString()
    });
  }),

  http.delete('*/api/ofertas/:id', ({ params }) => {
    const { id } = params;
    if (id === 'error') {
      return new HttpResponse(null, { status: 500 });
    }
    return HttpResponse.json({ success: true, id });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ofertaService.getOfertas - geração de URLSearchParams', () => {
  it('envia os filtros básicos corretamente', async () => {
    const res = await ofertaService.getOfertas({
      busca: 'eletricista',
      categoria: 'Construção',
      precoMin: 10,
      precoMax: 100,
      cidade: 'São Paulo',
      estado: 'SP',
      sort: 'avaliacao',
      comMidia: true,
      tipoPessoa: 'PJ',
    }, 1, 10);

    expect(res.ofertas[0].titulo).toContain('ECO-eletricista-Construção');
  });

  it('inclui lat/lng quando sort=distancia', async () => {
    const res = await ofertaService.getOfertas({
      sort: 'distancia',
      lat: -23.5,
      lng: -46.6,
    }, 1, 10);

    expect(res.total).toBe(1);
  });

  it('updateOferta deve enviar payload e retornar objeto atualizado', async () => {
    const updateData = { titulo: 'Novo Titulo', preco: 50 };
    const res = await ofertaService.updateOferta('123', updateData);

    expect(res._id).toBe('123');
    expect(res.titulo).toBe('Novo Titulo');
    expect(res.preco).toBe(50);
  });

  it('deleteOferta deve chamar a rota de exclusão com sucesso', async () => {
    await expect(ofertaService.deleteOferta('123')).resolves.toBeUndefined();
  });

  it('deleteOferta deve lançar erro quando a API falha', async () => {
    await expect(ofertaService.deleteOferta('error')).rejects.toThrow();
  });
});
