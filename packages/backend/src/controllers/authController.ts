import { Response } from 'express';
import User from '../models';
import logger, { loggerUtils, signAccessToken } from '../utils';
import { AuthRequest } from '../middleware/auth';
import { RegisterInput, LoginInput } from '../validation/authValidation';

interface AuthenticatedRequest extends AuthRequest {
    body: RegisterInput | LoginInput;
}

// Mapeia o tipo do usuário do modelo (pt) para o padrão da API (en)
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

// Mapeia tipo da API (en) para o modelo (pt)
const mapApiToModelTipo = (tipo: any): 'comprador' | 'prestador' | 'anunciante' => {
    switch (tipo) {
        case 'buyer':
            return 'comprador';
        case 'provider':
            return 'prestador';
        case 'advertiser':
            return 'anunciante';
        case 'comprador':
        case 'prestador':
        case 'anunciante':
            return tipo;
        default:
            return 'comprador';
    }
};

// Registrar usuario
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { nome, email, senha, telefone, tipo } = req.body as RegisterInput;

        // Verificar se utilizador já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Auditoria de autenticação - registro duplicado
            loggerUtils.logAuth('register', undefined, email, false);
            res.status(400).json({
                success: false,
                message: 'Email já cadastrado'
            });
            return;
        }

        const tipoDb = mapApiToModelTipo(tipo);

        // Criar usuario
        const user = new User({
            nome,
            email,
            senha,
            telefone,
            tipo: tipoDb
        });

        await user.save();

        // Gerar token (HS256, exp padrão 7d)
        const token = signAccessToken({ userId: user._id });

        // Auditoria de autenticação - sucesso de registro
        loggerUtils.logAuth('register', String(user._id), email, true);
        logger.info('Usuário registrado:', { userId: user._id, email });

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
                    telefone: user.telefone
                }
            }
        });
    } catch (error) {
        logger.error('Erro no registro:', error);
        // Auditoria de autenticação - falha no registro (erro interno)
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
            // Auditoria de autenticação - login com email não encontrado
            loggerUtils.logAuth('login', undefined, email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Verificar se conta está ativa
        if (!user.ativo) {
            // Auditoria de autenticação - conta desativada
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
            // Auditoria de autenticação - senha incorreta
            loggerUtils.logAuth('login', String(user._id), email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Gerar token (HS256, exp padrão 7d)
        const token = signAccessToken({ userId: user._id });

        // Auditoria de autenticação - sucesso de login
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
                    telefone: user.telefone
                }
            }
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        // Auditoria de autenticação - falha no login (erro interno)
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
                    tipo: mapTipoToApi(user.tipo),
                    ativo: user.ativo,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
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