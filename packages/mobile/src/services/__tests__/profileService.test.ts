import { updateName } from '../profileService';
import api from '../api';

jest.mock('../api', () => ({
  patch: jest.fn(),
  delete: jest.fn()
}));

describe('profileService - updateName', () => {
  it('should call api.patch and return normalized user', async () => {
    const mockUser = {
      _id: 'user123',
      nome: 'João Silva',
      email: 'joao@example.com',
      tipo: 'comprador',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    (api.patch as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: mockUser
      }
    });

    const result = await updateName('João Silva');

    expect(api.patch).toHaveBeenCalledWith('/v1/users/me/nome', { nome: 'João Silva' });
    expect(result).toEqual({
      id: 'user123',
      nome: 'João Silva',
      email: 'joao@example.com',
      tipo: 'buyer',
      avatar: undefined,
      avatarBlurhash: undefined,
      telefone: undefined,
      localizacao: undefined,
      avaliacao: undefined,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      tipoPessoa: 'PF',
      cpf: undefined,
      cnpj: undefined,
      razaoSocial: undefined,
      nomeFantasia: undefined,
      ativo: false
    });
  });

  it('should throw error if api fails', async () => {
    const error = new Error('Network Error');
    (api.patch as jest.Mock).mockRejectedValue(error);

    await expect(updateName('João Silva')).rejects.toThrow('Network Error');
  });
});
