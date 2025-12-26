import { Response } from 'express';
import User from '../models'; // O seu User.ts (Model) já está correto e pronto
import logger, { loggerUtils, signAccessToken } from '../utils';
import { AuthRequest } from '../middleware/auth';
import { RegisterInput, LoginInput } from '../validation/authValidation';
import { emailService } from '../services/emailService';

interface AuthenticatedRequest extends AuthRequest {
    // O body agora é corretamente tipado pela validação
    body: RegisterInput | LoginInput;
}

// Mapeia o tipo do usuário do modelo (pt) para o padrão da API (en)
// Esta função continua útil para formatar a RESPOSTA
const mapTipoToApi = (tipo: any): 'buyer' | 'provider' | 'advertiser' => {
    switch (tipo) {
        case 'comprador':
        case 'buyer':
            return 'buyer';
        case 'prestador':
        case 'provider':
            return 'provider';
        case 'anunciante':
        case 'advertiser':
            return 'advertiser';
        default:
            return 'buyer';
    }
};

// Registrar usuario
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const registerData = req.body as RegisterInput;

        // Verificar se utilizador já existe
        const existingUser = await User.findOne({ email: registerData.email });
        if (existingUser) {
            // Auditoria
            loggerUtils.logAuth('register', undefined, registerData.email, false);
            res.status(409).json({
                success: false,
                message: 'Email já cadastrado'
            });
            return;
        }

        // Criar usuário passando todos os dados
        const user = new User(registerData);

        await user.save();

        // Enviar e-mail de confirmação (síncrono, não bloqueia sucesso do cadastro se falhar o envio)
        try {
            const emailSent = await emailService.sendRegistrationConfirmationEmail(user.email, user.nome);
            if (!emailSent) {
                logger.warn('Email de boas-vindas não enviado', { userId: user._id, email: user.email });
            }
        } catch (error) {
            logger.error('Email error', { error, userId: user._id, email: user.email });
        }

        // Gerar token
        const token = signAccessToken({ userId: user._id });

        // Auditoria
        loggerUtils.logAuth('register', String(user._id), user.email, true);
        logger.info('Usuário registrado:', { userId: user._id, email: user.email });

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: {
                token,
                user: {
                    id: user._id,
                    nome: user.nome,
                    email: user.email,
                    tipo: mapTipoToApi(user.tipo),
                    telefone: user.telefone,
                    avatar: user.avatar || null,
                    avatarBlurhash: user.avatarBlurhash || null,
                    tipoPessoa: user.tipoPessoa,
                    cpf: user.cpf,
                    cnpj: user.cnpj,
                    razaoSocial: user.razaoSocial,
                    nomeFantasia: user.nomeFantasia,
                    ativo: user.ativo,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }
            }
        });
    } catch (error: any) {
        // Tratar erros de validação do Mongoose
        if (error.name === 'ValidationError') {
            logger.warn('Erro de validação Mongoose:', { error: error.message });
            // ✅ CORREÇÃO TS2322: Separar 'res.json' do 'return'
            res.status(400).json({ success: false, message: error.message });
            return;
        }

        // Tratar erro de chave duplicada (E11000)
        if (error.code === 11000) {
            logger.warn('Erro de duplicidade:', { error: error.keyValue });
            const field = Object.keys(error.keyValue || {})[0] || '';
            const message: string = (() => {
                if (/cnpj/i.test(field) || /cnpj/i.test(String(error.message))) return 'CNPJ já cadastrado';
                if (/cpf/i.test(field) || /cpf/i.test(String(error.message))) return 'CPF já cadastrado';
                if (/email/i.test(field) || /email/i.test(String(error.message))) return 'Email já cadastrado';
                return `O campo '${field || 'valor'}' já está em uso.`;
            })();
            const isConflict = /cnpj|cpf|email/i.test(field || '') || /cnpj|cpf|email/i.test(String(error.message));
            const statusCode = isConflict ? 409 : 400;
            res.status(statusCode).json({ success: false, message });
            return;
        }

        logger.error('Erro no registro:', error);
        loggerUtils.logAuth('register', undefined, (req.body as any)?.email, false);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Login
export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { email, senha } = req.body as LoginInput;

        // Buscar utilizador com senha
        const user = await User.findOne({ email }).select('+senha');
        if (!user) {
            loggerUtils.logAuth('login', undefined, email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Verificar se conta está ativa
        if (!user.ativo) {
            loggerUtils.logAuth('login', String(user._id), email, false);
            res.status(400).json({
                success: false,
                message: 'Conta desativada'
            });
            return;
        }

        // Verificar senha
        const isMatch = await user.comparePassword(senha);
        if (!isMatch) {
            loggerUtils.logAuth('login', String(user._id), email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Gerar token
        const token = signAccessToken({ userId: user._id });

        loggerUtils.logAuth('login', String(user._id), email, true);
        logger.info('Login realizado:', { userId: user._id, email });

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                token,
                user: {
                    id: user._id,
                    nome: user.nome,
                    email: user.email,
                    tipo: mapTipoToApi(user.tipo),
                    telefone: user.telefone,
                    avatar: user.avatar || null,
                    avatarBlurhash: user.avatarBlurhash || null,
                    tipoPessoa: user.tipoPessoa,
                    cpf: user.cpf,
                    cnpj: user.cnpj,
                    razaoSocial: user.razaoSocial,
                    nomeFantasia: user.nomeFantasia,
                    ativo: user.ativo,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }
            }
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        loggerUtils.logAuth('login', undefined, (req.body as any)?.email, false);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Perfil do usuario
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            res.status(401).json({
                success: false,
                message: 'Não autenticado'
            });
            return;
        }

        const user = await User.findById(authUser.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Perfil recuperado com sucesso',
            data: {
                user: {
                    id: user._id,
                    nome: user.nome,
                    email: user.email,
                    telefone: user.telefone,
                    avatar: user.avatar || null,
                    avatarBlurhash: user.avatarBlurhash || null,
                    tipo: mapTipoToApi(user.tipo),
                    ativo: user.ativo,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    tipoPessoa: user.tipoPessoa,
                    cpf: user.cpf,
                    cnpj: user.cnpj,
                    razaoSocial: user.razaoSocial,
                    nomeFantasia: user.nomeFantasia,
                }
            }
        });
    } catch (error) {
        logger.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Preferências do usuário (GET)
export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            res.status(401).json({ success: false, message: 'Não autenticado' });
            return;
        }
        const user = await User.findById(authUser.id).lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Preferências recuperadas', data: { preferencias: user.preferencias || {} } });
    } catch (error) {
        logger.error('Erro ao obter preferências:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

// Preferências do usuário (PUT)
export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            res.status(401).json({ success: false, message: 'Não autenticado' });
            return;
        }

        const body = (req.body || {}) as { preferencias?: { ofertas?: { sort?: string } } };
        const prefs = body?.preferencias || {};

        // Sanitizar sort se presente
        const allowedSort = new Set(['relevancia','preco_menor','preco_maior','avaliacao','recente','distancia']);
        if (prefs?.ofertas?.sort && !allowedSort.has(prefs.ofertas.sort)) {
            res.status(400).json({ success: false, message: "Parâmetro 'sort' inválido" });
            return;
        }

        const user = await User.findById(authUser.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            return;
        }
        const current = (user as any).preferencias || {};
        (user as any).preferencias = { ...current, ...prefs };
        await user.save();
        res.json({ success: true, message: 'Preferências atualizadas', data: { preferencias: (user as any).preferencias } });
    } catch (error) {
        logger.error('Erro ao atualizar preferências:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};