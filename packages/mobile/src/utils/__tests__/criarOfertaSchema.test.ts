import { criarOfertaSchema, PRICE_UNITS, OFERTA_MEDIA_CONFIG } from '@/utils/validation';

const makeValidData = (overrides: Partial<any> = {}) => ({
  titulo: 'Pintura residencial',
  descricao: 'Executo serviços de pintura com materiais inclusos.',
  precoText: 'R$ 150,00',
  priceUnit: 'hora',
  categoria: 'servicos',
  subcategoria: 'pintura',
  cidade: 'São Paulo',
  estado: 'SP',
  ...overrides,
});

const makeMedia = (n: number) =>
  Array.from({ length: n }).map((_, i) => ({
    uri: `file:///image-${i}.jpg`,
    name: `image-${i}.jpg`,
    type: 'image/jpeg' as const,
    size: 1000,
  }));

describe('criarOfertaSchema - preço e unidade do preço', () => {
  it('valida com sucesso para cada unidade de preço permitida', () => {
    for (const unit of PRICE_UNITS) {
      const result = criarOfertaSchema.safeParse(makeValidData({ priceUnit: unit }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priceUnit).toBe(unit);
      }
    }
  });

  it('falha quando precoText não tem dígitos', () => {
    const res = criarOfertaSchema.safeParse(makeValidData({ precoText: '' }));
    expect(res.success).toBe(false);
    if (!res.success) {
      const issues = res.error.issues;
      expect(issues.some((i) => i.path.join('.') === 'precoText')).toBe(true);
    }
  });

  it('falha quando precoText representa 0,00', () => {
    const res = criarOfertaSchema.safeParse(makeValidData({ precoText: 'R$ 0,00' }));
    expect(res.success).toBe(false);
    if (!res.success) {
      const precoIssues = res.error.issues.filter((i) => i.path.join('.') === 'precoText');
      expect(precoIssues.length).toBeGreaterThan(0);
    }
  });

  it('falha quando priceUnit está ausente', () => {
    // @ts-expect-error testando ausência
    const res = criarOfertaSchema.safeParse(makeValidData({ priceUnit: undefined }));
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join('.') === 'priceUnit');
      expect(issue).toBeTruthy();
      // Mensagem definida no schema
      expect(issue?.message).toBe('Selecione a unidade do preço');
    }
  });

  it('falha quando priceUnit é inválida', () => {
    const res = criarOfertaSchema.safeParse(makeValidData({ priceUnit: 'semana' }));
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join('.') === 'priceUnit');
      expect(issue).toBeTruthy();
    }
  });

  it('mediaFiles é opcional e assume [] quando omitido', () => {
    const { mediaFiles, ...withoutMedia } = makeValidData();
    const res = criarOfertaSchema.safeParse(withoutMedia);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.mediaFiles).toEqual([]);
    }
  });

  it(`falha quando mediaFiles excede ${OFERTA_MEDIA_CONFIG.MAX_FILES}`, () => {
    const tooMany = OFERTA_MEDIA_CONFIG.MAX_FILES + 1;
    const res = criarOfertaSchema.safeParse(
      makeValidData({ mediaFiles: makeMedia(tooMany) })
    );
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join('.') === 'mediaFiles');
      expect(issue).toBeTruthy();
    }
  });
});

describe('criarOfertaSchema - localização condicional', () => {
  it('valida com sucesso quando estado é BR e cidade está vazia', () => {
    const res = criarOfertaSchema.safeParse(makeValidData({ estado: 'BR', cidade: '' }));
    expect(res.success).toBe(true);
  });

  it('falha quando estado NÃO é BR e cidade está vazia', () => {
    const res = criarOfertaSchema.safeParse(makeValidData({ estado: 'SP', cidade: '' }));
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path.join('.') === 'cidade');
      expect(issue).toBeTruthy();
    }
  });
});
