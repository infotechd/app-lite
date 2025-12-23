// packages/mobile/src/utils/profile/__tests__/calculateProfileCompletion.test.ts
import { calculateProfileCompletion } from '@/utils/profile/calculateProfileCompletion';
import { User } from '@/types';

const baseUser: User = {
  id: 'u1',
  nome: 'Teste',
  email: 't@example.com',
  tipo: 'buyer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tipoPessoa: 'PF',
  ativo: true,
};

describe('calculateProfileCompletion', () => {
  it('retorna 0% quando nenhum item completo (PF)', () => {
    const user: User = { ...baseUser, avatar: '', telefone: '', localizacao: undefined, cpf: '' } as any;
    const pct = calculateProfileCompletion(user);
    expect(pct).toBe(0);
  });

  it('retorna 100% quando todos itens PF completos', () => {
    const user: User = {
      ...baseUser,
      avatar: 'https://cdn/app/avatar.png',
      telefone: '(11) 99999-9999',
      localizacao: { cidade: 'São Paulo', estado: 'SP' },
      cpf: '123.456.789-09',
    };
    const pct = calculateProfileCompletion(user);
    expect(pct).toBe(100);
  });

  it('retorna 100% quando todos itens PJ completos', () => {
    const pj: User = {
      ...baseUser,
      tipoPessoa: 'PJ',
      avatar: 'a',
      telefone: '11999999999',
      localizacao: { cidade: 'Rio de Janeiro', estado: 'RJ' },
      cnpj: '12.345.678/0001-99',
      razaoSocial: 'Empresa X LTDA',
      nomeFantasia: 'Empresa X',
    };
    const pct = calculateProfileCompletion(pj);
    expect(pct).toBe(100);
  });

  it('lida com strings com espaços vazios e normaliza documentos', () => {
    const user: User = {
      ...baseUser,
      avatar: '   ',
      telefone: '   ',
      localizacao: { cidade: '  ', estado: ' SP ' },
      cpf: '111',
    } as any;
    const pct = calculateProfileCompletion(user);
    // Todos incompletos (avatar/telefone/cidade inválidos; CPF tem 11 dígitos mas resto incompleto)
    expect(pct).toBe(0);
  });
});
