import { userController } from '../../controllers/userController';
import User from '../../models/User';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import bcrypt from 'bcryptjs';

jest.mock('../../models/User');
jest.mock('../../utils/logger');
jest.mock('bcryptjs');

describe('User Controller - changePassword', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: { id: 'user123' },
      body: { currentPassword: 'oldPassword', newPassword: 'newPassword123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if currentPassword or newPassword is missing', async () => {
    req.body = { currentPassword: 'oldPassword' }; // missing newPassword
    
    await userController.changePassword(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Senha atual e nova são obrigatórias.'
    }));
  });

  it('should return 400 if newPassword is too short', async () => {
    req.body = { currentPassword: 'oldPassword', newPassword: '123' };
    
    await userController.changePassword(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Nova senha deve ter no mínimo 6 caracteres.'
    }));
  });

  it('should return 400 if current password is incorrect (formerly 401)', async () => {
    const mockUser = {
      id: 'user123',
      senha: 'hashedOldPassword',
      save: jest.fn().mockResolvedValue(true)
    };

    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Wrong password

    await userController.changePassword(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400); // This is what we fixed!
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Senha atual incorreta.'
    }));
  });

  it('should update password and return 200 on success', async () => {
    const mockUser = {
      id: 'user123',
      senha: 'hashedOldPassword',
      save: jest.fn().mockResolvedValue(true)
    };

    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Correct password

    await userController.changePassword(req as AuthRequest, res as Response, next);

    expect(mockUser.senha).toBe('newPassword123'); // Password updated
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Senha alterada com sucesso.'
    }));
  });
});
