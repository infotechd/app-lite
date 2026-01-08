import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { uploadService } from '../services/uploadService';
import { logger } from '../utils/logger';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { updateNameSchema, updatePhoneSchema, updateLocationSchema, updateEmailSchema } from '../validation/userValidation';
import { validate } from '../middleware/validation';
import { emailService } from '../services/emailService';

/**
 * Controller responsável por gerenciar as operações relacionadas ao perfil do usuário.
 * Contém métodos para manipulação de recursos como fotos de perfil (avatar).
 */
export const userController = {
  /**
   * Atualiza o nome do usuário autenticado.
   *
   * Este método realiza as seguintes etapas:
   * 1. Valida os dados da requisição com base no schema definido.
   * 2. Recupera o ID do usuário através do token de autenticação.
   * 3. Atualiza o nome do usuário no banco de dados.
   * 4. Retorna os dados atualizados do usuário.
   *
   * @param {AuthRequest} req - Objeto de requisição do Express, contendo os dados do usuário autenticado.
   * @param {Response} res - Objeto de resposta do Express usado para retornar o status e dados do usuário atualizado.
   * @param {NextFunction} next - Função do Express para passar o controle/erro para o próximo middleware de tratamento.
   * @returns {Promise<void>} - Retorna uma resposta JSON com o sucesso da operação e os dados do usuário.
   */
  updateName: [
    validate(updateNameSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const { nome } = req.body as { nome: string };

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { nome },
          { new: true }
        ).select('-senha -password');

        if (!updatedUser) {
          return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        res.status(200).json({
          success: true,
          message: 'Nome atualizado com sucesso.',
          data: updatedUser,
        });
      } catch (error: any) {
        logger.error('userController.updateName.error', { error: error.message, userId: req.user?.id });
        next(error);
      }
    }
  ],

  /**
   * Atualiza o telefone do usuário autenticado.
   *
   * @param {AuthRequest} req - Requisição contendo o novo telefone.
   * @param {Response} res - Resposta com o usuário atualizado.
   * @param {NextFunction} next - Middleware de erro.
   */
  updatePhone: [
    validate(updatePhoneSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const { telefone } = req.body as { telefone: string };

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { telefone },
          { new: true }
        ).select('-senha -password');

        if (!updatedUser) {
          return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        res.status(200).json({
          success: true,
          message: 'Telefone atualizado com sucesso.',
          data: updatedUser,
        });
      } catch (error: any) {
        logger.error('userController.updatePhone.error', { error: error.message, userId: req.user?.id });
        next(error);
      }
    }
  ],

  /**
   * Atualiza a localização (cidade e estado) do usuário autenticado.
   *
   * @param {AuthRequest} req - Requisição contendo a nova localização.
   * @param {Response} res - Resposta com o usuário atualizado.
   * @param {NextFunction} next - Middleware de erro.
   */
  updateLocation: [
    validate(updateLocationSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const { cidade, estado } = req.body as { cidade: string; estado: string };

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { 
            localizacao: { cidade, estado } 
          },
          { new: true }
        ).select('-senha -password');

        if (!updatedUser) {
          return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        res.status(200).json({
          success: true,
          message: 'Localização atualizada com sucesso.',
          data: updatedUser,
        });
      } catch (error: any) {
        logger.error('userController.updateLocation.error', { error: error.message, userId: req.user?.id });
        next(error);
      }
    }
  ],

  // Inicia fluxo de atualização de e-mail (solicitação)
  updateEmailRequest: [
    validate(updateEmailSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.id;
        const { email, currentPassword } = req.body as { email: string; currentPassword: string };

        const user = await User.findById(userId).select('+senha');
        if (!user) {
          return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        // Verifica se a senha confere
        const passwordOk = await bcrypt.compare(currentPassword, user.senha);
        if (!passwordOk) {
          return res.status(400).json({ success: false, message: 'Senha atual incorreta.' });
        }

        // Verifica se o e-mail é o mesmo do atual
        if (user.email === email) {
          return res.status(400).json({ success: false, message: 'O e-mail informado já é o atual.' });
        }

        // Verifica se e-mail já está em uso por outro usuário
        const emailInUse = await User.findOne({ email });
        if (emailInUse) {
          return res.status(409).json({ success: false, message: 'Este e-mail já está em uso.' });
        }

        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

        user.pendingEmail = email;
        user.emailChangeToken = token;
        user.emailChangeExpires = expires;
        await user.save();

        // Dispara e-mail de confirmação com link/token
        try {
          await emailService.send({
            to: email,
            subject: 'Confirme a alteração de e-mail',
            html: `
              <p>Você solicitou alterar o e-mail da sua conta App Lite.</p>
              <p>Use o token abaixo para confirmar a alteração (válido por 1 hora):</p>
              <p><strong>${token}</strong></p>
            `,
          });
        } catch (mailErr: any) {
          logger.error('userController.updateEmailRequest.emailError', { error: mailErr.message, userId });
          return res.status(500).json({ success: false, message: 'Não foi possível enviar o e-mail de confirmação. Tente novamente.' });
        }

        return res.status(200).json({
          success: true,
          message: 'Solicitação registrada. Verifique o novo e-mail para confirmar.',
        });
      } catch (error: any) {
        logger.error('userController.updateEmailRequest.error', { error: error.message, userId: req.user?.id });
        next(error);
      }
    }
  ],

  // Confirma a alteração de e-mail com token enviado
  confirmEmailUpdate: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body as { token?: string };

      if (!token) {
        return res.status(400).json({ success: false, message: 'Token é obrigatório.' });
      }

      const user = await User.findById(userId).select('+senha');
      if (!user || !user.emailChangeToken || !user.pendingEmail || !user.emailChangeExpires) {
        return res.status(400).json({ success: false, message: 'Nenhuma solicitação de alteração de e-mail encontrada.' });
      }

      if (user.emailChangeToken !== token) {
        return res.status(400).json({ success: false, message: 'Token inválido.' });
      }

      if (user.emailChangeExpires.getTime() < Date.now()) {
        user.emailChangeToken = undefined;
        user.pendingEmail = undefined;
        user.emailChangeExpires = undefined;
        await user.save();
        return res.status(400).json({ success: false, message: 'Token expirado. Solicite novamente.' });
      }

      // Verifica novamente unicidade antes de confirmar
      const emailInUse = await User.findOne({ email: user.pendingEmail });
      if (emailInUse) {
        return res.status(409).json({ success: false, message: 'Este e-mail já está em uso.' });
      }

      user.email = user.pendingEmail;
      user.pendingEmail = undefined;
      user.emailChangeToken = undefined;
      user.emailChangeExpires = undefined;
      await user.save();

      const sanitized = user.toObject();
      delete (sanitized as any).senha;

      return res.status(200).json({
        success: true,
        message: 'E-mail atualizado com sucesso.',
        data: sanitized,
      });
    } catch (error: any) {
      logger.error('userController.confirmEmailUpdate.error', { error: error.message, userId: req.user?.id });
      next(error);
    }
  },

  /**
   * Atualiza ou adiciona a foto de perfil (avatar) do usuário autenticado.
   * 
   * Este método realiza as seguintes etapas:
   * 1. Valida se um arquivo foi enviado na requisição.
   * 2. Recupera o ID do usuário através do token de autenticação.
   * 3. Busca o identificador da foto antiga (se existir) para substituição.
   * 4. Realiza o upload da nova imagem para o serviço de armazenamento (Cloudinary).
   * 5. Atualiza os campos 'avatar' e 'avatarPublicId' no documento do usuário no MongoDB.
   * 
   * @param {AuthRequest} req - Objeto de requisição do Express, contendo o arquivo e dados do usuário autenticado.
   * @param {Response} res - Objeto de resposta do Express usado para retornar o status e dados do usuário atualizado.
   * @param {NextFunction} next - Função do Express para passar o controle/erro para o próximo middleware de tratamento.
   * @returns {Promise<void>} - Retorna uma resposta JSON com o sucesso da operação e os dados do usuário.
   */
  async updateAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Extrai o arquivo enviado via middleware de upload (ex: multer)
      const file = req.file;
      
      // Verifica se o arquivo está presente na requisição
      if (!file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado.' });
      }

      // Obtém o ID do usuário autenticado (garantido pelo middleware de auth)
      const userId = req.user!.id;
      
      // Busca apenas o campo avatarPublicId do usuário no banco de dados
      // Necessário para informar ao serviço de upload qual imagem antiga deve ser substituída/deletada
      const user = await User.findById(userId).select('avatarPublicId');
      
      // Realiza o upload da nova imagem através do serviço dedicado
      // O serviço de upload já gerencia a lógica de deletar a imagem anterior se o previousPublicId for fornecido
      const result = await uploadService.uploadAvatar(file, userId, user?.avatarPublicId);

      // Atualiza o registro do usuário no banco de dados com a nova URL e o novo ID público do Cloudinary
      // O método findByIdAndUpdate com { new: true } retorna o documento já atualizado
      // .select('-password') garante que a senha não seja enviada na resposta por segurança
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          avatar: result.secureUrl, 
          avatarPublicId: result.publicId 
        },
        { new: true }
      ).select('-password');

      // Retorna a resposta de sucesso com os dados do usuário atualizados
      res.status(200).json({ 
        success: true, 
        message: 'Avatar atualizado com sucesso.', 
        data: updatedUser 
      });
    } catch (error: any) {
      // Registra o erro no log do sistema para depuração
      logger.error('userController.updateAvatar.error', { error: error.message, userId: req.user?.id });
      // Encaminha o erro para o middleware global de tratamento de erros
      next(error);
    }
  },

  /**
   * Remove a foto de perfil (avatar) do usuário autenticado.
   * 
   * Este método realiza as seguintes etapas:
   * 1. Identifica o usuário e busca o seu identificador de imagem atual (avatarPublicId).
   * 2. Se houver uma imagem vinculada, solicita a exclusão no serviço de armazenamento externo.
   * 3. Limpa (remove) os campos relacionados ao avatar no documento do usuário no MongoDB.
   * 
   * @param {AuthRequest} req - Objeto de requisição do Express com os dados do usuário autenticado.
   * @param {Response} res - Objeto de resposta do Express para confirmar a remoção.
   * @param {NextFunction} next - Função do Express para tratamento de erros.
   * @returns {Promise<void>} - Retorna uma resposta JSON confirmando a remoção e os dados atualizados do usuário.
   */
  async removeAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Obtém o ID do usuário a partir do objeto de requisição autenticada
      const userId = req.user!.id;
      
      // Busca o registro do usuário para obter o ID público da imagem no Cloudinary
      const user = await User.findById(userId).select('avatarPublicId');

      // Verifica se o usuário possui um avatarPublicId registrado
      if (user && user.avatarPublicId) {
        try {
          // Tenta deletar o arquivo fisicamente do Cloudinary
          await uploadService.deleteFile(user.avatarPublicId, 'image');
        } catch (deleteError: any) {
          // Caso ocorra falha na deleção externa, registramos como aviso mas não interrompemos o processo
          // Isso evita que o usuário fique preso com um registro no banco que aponta para um arquivo que ele quer remover
          logger.warn('userController.removeAvatar.deleteFileError', { 
            error: deleteError.message, 
            publicId: user.avatarPublicId 
          });
          // Prossegue mesmo se falhar ao deletar no Cloudinary para garantir a limpeza do banco
        }
      }

      // Remove os campos avatar e avatarPublicId do documento no banco usando o operador $unset do MongoDB
      // .select('-password') oculta a senha nos dados retornados
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $unset: { avatar: '', avatarPublicId: '' } },
        { new: true }
      ).select('-password');

      // Responde informando que a operação foi concluída com sucesso
      res.status(200).json({ 
        success: true, 
        message: 'Avatar removido com sucesso.', 
        data: updatedUser 
      });
    } catch (error: any) {
      // Registro de log em caso de erro inesperado durante o processo
      logger.error('userController.removeAvatar.error', { error: error.message, userId: req.user?.id });
      // Delegação para o middleware de erro
      next(error);
    }
  },

  /**
   * Altera a senha do usuário autenticado.
   *
   * Este método realiza as seguintes etapas:
   * 1. Valida os dados da requisição (senha atual e nova).
   * 2. Recupera o ID do usuário através do token de autenticação.
   * 3. Verifica se a senha atual está correta.
   * 4. Atualiza a senha do usuário no banco de dados.
   * 5. Retorna uma confirmação da atualização.
   *
   * @param {AuthRequest} req - Objeto de requisição do Express, contendo os dados do usuário autenticado.
   * @param {Response} res - Objeto de resposta do Express usado para retornar o status da operação.
   * @param {NextFunction} next - Função do Express para passar o controle/erro para o próximo middleware de tratamento.
   * @returns {Promise<void>} - Retorna uma resposta JSON com o sucesso da operação.
   */
  changePassword: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Senha atual e nova são obrigatórias.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Nova senha deve ter no mínimo 6 caracteres.' });
      }

      const user = await User.findById(userId).select('+senha');
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const passwordOk = await bcrypt.compare(currentPassword, user.senha);
      if (!passwordOk) {
        return res.status(400).json({ success: false, message: 'Senha atual incorreta.' });
      }

      user.senha = newPassword;
      // Invalida tokens de reset existentes
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(200).json({ success: true, message: 'Senha alterada com sucesso.' });
    } catch (error: any) {
      logger.error('userController.changePassword.error', { error: error.message, userId: req.user?.id });
      next(error);
    }
  },
};
