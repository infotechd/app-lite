import { updateName, uploadAvatar, removeAvatar } from '../profileService';
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

describe('profileService - avatar operations', () => {
  const mockUser = {
    _id: 'user123',
    nome: 'João Silva',
    email: 'joao@example.com',
    tipo: 'comprador',
    avatar: 'https://cloudinary.com/avatar.jpg'
  };

  it('should call api.patch for uploadAvatar and return normalized user', async () => {
    (api.patch as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: mockUser
      }
    });

    const file = { uri: 'file://path/to/img.jpg', type: 'image/jpeg', name: 'img.jpg' };
    const result = await uploadAvatar(file);

    expect(api.patch).toHaveBeenCalledWith(
      '/v1/users/me/avatar',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
    expect(result.avatar).toBe(mockUser.avatar);
  });

  it('should call api.delete for removeAvatar and return normalized user without avatar', async () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined };
    (api.delete as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: userWithoutAvatar
      }
    });

    const result = await removeAvatar();

    expect(api.delete).toHaveBeenCalledWith('/v1/users/me/avatar');
    expect(result.avatar).toBeUndefined();
  });
});
