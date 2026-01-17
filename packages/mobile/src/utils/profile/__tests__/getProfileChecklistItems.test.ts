import { getProfileChecklistItems } from '../getProfileChecklistItems';
import { User } from '@/types';

const baseUser: User = {
  id: 'u1',
  nome: 'Teste',
  email: 't@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tipoPessoa: 'PF',
  ativo: true,
};

describe('getProfileChecklistItems', () => {
  it('deve retornar itens básicos e CPF para PF', () => {
    const user: User = { ...baseUser, tipoPessoa: 'PF' };
    const items = getProfileChecklistItems(user);
    
    expect(items.find(i => i.id === 'avatar')).toBeDefined();
    expect(items.find(i => i.id === 'phone')).toBeDefined();
    expect(items.find(i => i.id === 'location')).toBeDefined();
    expect(items.find(i => i.id === 'cpf')).toBeDefined();
    expect(items.find(i => i.id === 'cnpj')).toBeUndefined();
  });

  it('deve marcar localização como completa apenas se cidade e estado estiverem presentes', () => {
    const user1: User = { ...baseUser, localizacao: { cidade: 'São Paulo', estado: 'SP' } };
    expect(getProfileChecklistItems(user1).find(i => i.id === 'location')?.isComplete).toBe(true);

    const user2: User = { ...baseUser, localizacao: { cidade: '', estado: 'SP' } };
    expect(getProfileChecklistItems(user2).find(i => i.id === 'location')?.isComplete).toBe(false);

    const user3: User = { ...baseUser, localizacao: { cidade: 'São Paulo', estado: '' } };
    expect(getProfileChecklistItems(user3).find(i => i.id === 'location')?.isComplete).toBe(false);

    const user4: User = { ...baseUser, localizacao: undefined };
    expect(getProfileChecklistItems(user4).find(i => i.id === 'location')?.isComplete).toBe(false);
  });

  it('deve retornar itens de PJ para usuários PJ', () => {
    const user: User = { ...baseUser, tipoPessoa: 'PJ' };
    const items = getProfileChecklistItems(user);
    
    expect(items.find(i => i.id === 'cnpj')).toBeDefined();
    expect(items.find(i => i.id === 'razaoSocial')).toBeDefined();
    expect(items.find(i => i.id === 'nomeFantasia')).toBeDefined();
    expect(items.find(i => i.id === 'cpf')).toBeUndefined();
  });
});
