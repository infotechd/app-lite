import { describe, it, expect } from '@jest/globals';
import { createOfertaSchema, updateOfertaSchema } from './ofertaValidation';

describe('ofertaValidation - normalização de categoria', () => {
  it('deve aceitar slug sem acento no create e normalizar para nome canônico', () => {
    const parsed = createOfertaSchema.parse({
      body: {
        titulo: 'Pedreiro para reformas',
        descricao: 'Faço reformas em geral com qualidade e preço justo.',
        preco: 1500,
        unidadePreco: 'pacote',
        categoria: 'construcao', // slug sem acento
        localizacao: {
          cidade: 'São Paulo',
          estado: 'SP',
        },
        imagens: [],
        videos: [],
      }
    });

    expect(parsed.body.categoria).toBe('Construção');
  });

  it('deve aceitar nome canônico já acentuado no create', () => {
    const parsed = createOfertaSchema.parse({
      body: {
        titulo: 'Aula de programação',
        descricao: 'Ensino JavaScript para iniciantes e intermediários.',
        preco: 100,
        unidadePreco: 'aula',
        categoria: 'Educação',
        localizacao: {
          cidade: 'Belo Horizonte',
          estado: 'MG',
        },
      }
    });

    expect(parsed.body.categoria).toBe('Educação');
  });

  it('deve normalizar variações de maiúsculas/minúsculas e sem acento no update', () => {
    const parsed1 = updateOfertaSchema.parse({
      params: { id: '123' },
      body: { categoria: 'saude' } // slug
    });
    expect(parsed1.body?.categoria).toBe('Saúde');

    const parsed2 = updateOfertaSchema.parse({
      params: { id: '123' },
      body: { categoria: 'EDUCACAO' } // sem acento e caps
    });
    expect(parsed2.body?.categoria).toBe('Educação');
  });

  it('deve rejeitar categoria inválida', () => {
    expect(() =>
      createOfertaSchema.parse({
        body: {
          titulo: 'Serviço qualquer',
          descricao: 'Descrição válida com mais de 10 caracteres.',
          preco: 50,
          unidadePreco: 'hora',
          categoria: 'foo', // inválido
          localizacao: {
            cidade: 'Curitiba',
            estado: 'PR',
          },
        }
      })
    ).toThrow();
  });
});
