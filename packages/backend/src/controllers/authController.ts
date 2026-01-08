import { Response } from 'express';
import crypto from 'crypto';
import User from '../models'; // O seu User.ts (Model) já está correto e pronto
import logger, { loggerUtils, signAccessToken } from '../utils';
import { AuthRequest } from '../middleware/auth';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../validation/authValidation';
import { emailService } from '../services/emailService';

interface AuthenticatedRequest extends AuthRequest {
    // O body agora é corretamente tipado pela validação
    body: RegisterInput | LoginInput;
}

/**
 * @function mapTipoToApi
 * @description Mapeia a nomenclatura interna de tipos de usuário (em português ou inglês) 
 * para o padrão esperado pela API e pelo Aplicativo Móvel (buyer, provider, advertiser).
 * 
 * @param {any} tipo - O valor bruto do tipo vindo do banco de dados ou input.
 * @returns {'buyer' | 'provider' | 'advertiser'} O tipo normalizado para a API.
 */
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

/**
 * @async
 * @function register
 * @description Realiza o cadastro de um novo usuário no sistema. 
 * Valida a existência do e-mail, salva os dados no MongoDB, dispara e-mail de boas-vindas
 * e retorna um token JWT para acesso imediato.
 * 
 * @param {AuthenticatedRequest} req - Objeto de requisição do Express contendo os dados do registro no body.
 * @param {Response} res - Objeto de resposta do Express.
 * @returns {Promise<void>}
 */
export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const registerData = req.body as RegisterInput;

        // Verificar se utilizador já existe para evitar duplicidade de contas
        const existingUser = await User.findOne({ email: registerData.email });
        if (existingUser) {
            // Auditoria de tentativa falha
            loggerUtils.logAuth('register', undefined, registerData.email, false);
            res.status(409).json({
                success: false,
                message: 'Email já cadastrado'
            });
            return;
        }

        // Criar instância do modelo User passando todos os dados validados
        const user = new User(registerData);

        await user.save();

        // RESOLUÇÃO DO PROBLEMA: Envolvendo o envio em um try/catch e removendo o 'void'.
        // Agora aguardamos o envio ou pelo menos capturamos o erro explicitamente para logs.
        try {
            await emailService.sendWelcomeEmail(user.email, user.nome);
        } catch (emailError) {
            // Registramos a falha especificamente no log para facilitar o diagnóstico (ex: domínio não verificado no Resend)
            logger.error('⚠️ Usuário cadastrado, mas o e-mail de boas-vindas falhou:', emailError);
            // Nota: Não retornamos erro 500 aqui pois o registro no banco de dados foi concluído com sucesso.
        }

        // Gerar token de acesso JWT
        const token = signAccessToken({ userId: user._id });

        // Auditoria de sucesso
        loggerUtils.logAuth('register', String(user._id), user.email, true);
        logger.info('Usuário registrado:', { userId: user._id, email: user.email });

        // Resposta de sucesso com dados do usuário formatados para a API
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
                    localizacao: user.localizacao,
                    ativo: user.ativo,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }
            }
        });
    } catch (error: any) {
        // Tratamento de erros específicos e genéricos...
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

/**
 * @async
 * @function login
 * @description Autentica um usuário existente através de e-mail e senha.
 * Verifica as credenciais, o status da conta (ativo) e retorna um novo token JWT.
 * 
 * @param {AuthenticatedRequest} req - Requisição contendo email e senha.
 * @param {Response} res - Resposta com os dados do usuário e token.
 * @returns {Promise<void>}
 */
export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { email, senha } = req.body as LoginInput;

        // Buscar utilizador com senha (o campo 'senha' é select: false por padrão no model)
        const user = await User.findOne({ email }).select('+senha');
        if (!user) {
            loggerUtils.logAuth('login', undefined, email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Verificar se conta está ativa antes de permitir o acesso
        if (!user.ativo) {
            loggerUtils.logAuth('login', String(user._id), email, false);
            res.status(400).json({
                success: false,
                message: 'Conta desativada'
            });
            return;
        }

        // Verificar se a senha informada corresponde ao hash no banco
        const isMatch = await user.comparePassword(senha);
        if (!isMatch) {
            loggerUtils.logAuth('login', String(user._id), email, false);
            res.status(400).json({
                success: false,
                message: 'Credenciais inválidas'
            });
            return;
        }

        // Gerar novo token de acesso JWT
        const token = signAccessToken({ userId: user._id });

        // Logs de auditoria
        loggerUtils.logAuth('login', String(user._id), email, true);
        logger.info('Login realizado:', { userId: user._id, email });

        // Retorna sucesso e dados normalizados para o App
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
                    localizacao: user.localizacao,
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

/**
 * @async
 * @function getProfile
 * @description Recupera os dados detalhados do perfil do usuário autenticado.
 * Utiliza o ID contido no token JWT para buscar as informações no MongoDB.
 * 
 * @param {AuthRequest} req - Requisição contendo o objeto 'user' populado pelo middleware de autenticação.
 * @param {Response} res - Resposta contendo os dados do perfil.
 * @returns {Promise<void>}
 */
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

        // Buscar usuário pelo ID extraído do token
        const user = await User.findById(authUser.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
            return;
        }

        // Retornar perfil completo com dados normalizados
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
                    localizacao: user.localizacao,
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

/**
 * @async
 * @function getPreferences
 * @description Recupera as configurações e preferências personalizadas do usuário.
 * 
 * @param {AuthRequest} req - Requisição autenticada.
 * @param {Response} res - Resposta contendo o objeto de preferências.
 * @returns {Promise<void>}
 */
export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            res.status(401).json({ success: false, message: 'Não autenticado' });
            return;
        }
        
        // Busca apenas as preferências usando lean() para melhor performance
        const user = await User.findById(authUser.id).lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            return;
        }
        
        res.json({ 
            success: true, 
            message: 'Preferências recuperadas', 
            data: { preferencias: user.preferencias || {} } 
        });
    } catch (error) {
        logger.error('Erro ao obter preferências:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

/**
 * @async
 * @function updatePreferences
 * @description Atualiza as preferências do usuário (ex: ordenação de ofertas).
 * Realiza a mesclagem (merge) entre as preferências atuais e as novas enviadas no body.
 * 
 * @param {AuthRequest} req - Requisição contendo as novas preferências.
 * @param {Response} res - Resposta confirmando a atualização.
 * @returns {Promise<void>}
 */
export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const authUser = req.user;
        if (!authUser?.id) {
            res.status(401).json({ success: false, message: 'Não autenticado' });
            return;
        }

        const body = (req.body || {}) as { preferencias?: { ofertas?: { sort?: string } } };
        const prefs = body?.preferencias || {};

        // Sanitização: Garante que o parâmetro de ordenação seja um valor permitido
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

        // Realiza o merge das preferências para não sobrescrever dados não enviados
        const current = (user as any).preferencias || {};
        (user as any).preferencias = { ...current, ...prefs };
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Preferências atualizadas', 
            data: { preferencias: (user as any).preferencias } 
        });
    } catch (error) {
        logger.error('Erro ao atualizar preferências:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

/**
 * @async
 * @function forgotPassword
 * @description Inicia o processo de recuperação de senha, gerando um token e enviando por e-mail.
 *
 * @param {AuthRequest} req - Requisição contendo o e-mail do usuário.
 * @param {Response} res - Resposta confirmando o envio do e-mail.
 * @returns {Promise<void>}
 */
export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email } = req.body as ForgotPasswordInput;
        const user = await User.findOne({ email });

        // Sempre respondemos sucesso para evitar enumeração, mas só processa se existir
        if (!user) {
            res.json({ success: true, message: 'Se este e-mail existir, enviaremos instruções em breve.' });
            return;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpires = expires;
        await user.save();

        try {
            await emailService.sendResetPasswordEmail(user.email, token);
        } catch (mailErr) {
            logger.error('forgotPassword.emailError', mailErr);
        }

        res.json({ success: true, message: 'Se este e-mail existir, enviaremos instruções em breve.' });
    } catch (error) {
        logger.error('Erro no forgotPassword:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};

/**
 * @async
 * @function resetPassword
 * @description Redefine a senha do usuário utilizando um token válido.
 *
 * @param {AuthRequest} req - Requisição contendo o token e a nova senha.
 * @param {Response} res - Resposta confirmando a redefinição da senha.
 * @returns {Promise<void>}
 */
export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const body = req.body as any;
        const token = body.token;
        const senha = body.senha || body.password; // Aceita 'senha' (do transform) ou 'password' (fallback)

        if (!token || !senha) {
            res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios.' });
            return;
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: new Date() },
        }).select('+senha');

        if (!user) {
            res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
            return;
        }

        // Atualiza a senha. O hook pre('save') no model User fará o hash automaticamente.
        user.senha = senha;
        
        // Limpa explicitamente os campos de recuperação para invalidar o token atual
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        // Salva as alterações no banco de dados
        await user.save();
        
        logger.info('Senha redefinida com sucesso', { userId: user._id, email: user.email });

        const accessToken = signAccessToken({ userId: user._id });

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso.',
            data: {
                token: accessToken,
                user: {
                    id: user._id,
                    nome: user.nome,
                    email: user.email,
                    tipo: mapTipoToApi((user as any).tipo),
                },
            },
        });
    } catch (error) {
        logger.error('Erro no resetPassword:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
};
