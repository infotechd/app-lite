import { userController } from '../../controllers/userController';
import User from '../../models/User';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';

jest.mock('../../models/User');
jest.mock('../../utils/logger');

describe('User Controller - updateName', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: { id: 'user123' },
      body: { nome: 'Novo Nome' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should update user name and return 200', async () => {
    const mockUpdatedUser = {
      id: 'user123',
      nome: 'Novo Nome',
      email: 'test@example.com'
    };

    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUpdatedUser)
    });

    // O controller updateName é um array [middleware, handler]
    // Pegamos o handler que é o último elemento
    const handler = (userController.updateName as any)[1];
    
    await handler(req as AuthRequest, res as Response, next);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user123',
      { nome: 'Novo Nome' },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Nome atualizado com sucesso.',
      data: mockUpdatedUser
    });
  });

  it('should return 404 if user not found', async () => {
    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    const handler = (userController.updateName as any)[1];
    
    await handler(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Usuário não encontrado'
    });
  });

  it('should call next with error if something fails', async () => {
    const error = new Error('DB Error');
    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockRejectedValue(error)
    });

    const handler = (userController.updateName as any)[1];
    
    await handler(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
