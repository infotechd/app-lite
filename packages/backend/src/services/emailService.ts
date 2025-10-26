// Importa o Nodemailer para envio de emails
import nodemailer from 'nodemailer';
// Importa o logger customizado do projeto para registrar logs estruturados
import { logger } from '../utils/logger';

// Configuração do transporter (conexão SMTP reutilizável)
// Mantemos em memória para evitar recriações desnecessárias a cada envio
// Melhoria: considerar tempo de vida (TTL) e/ou verificação de saúde do transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializa (lazy) e retorna uma instância de transporter do Nodemailer
 * - Usa variáveis de ambiente para selecionar o provedor
 * - Reutiliza a mesma instância entre chamadas para eficiência
 * Melhoria: validar previamente as envs necessárias por provedor e falhar cedo.
 */
function getTransporter(): nodemailer.Transporter {
    // Se já existir um transporter em memória, apenas reutiliza
    if (transporter) return transporter;

    // Configuração baseada em variáveis de ambiente
    // EMAIL_PROVIDER pode ser: 'gmail' | 'sendgrid' | 'smtp' | (outros → ethereal dev)
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';

    if (emailProvider === 'gmail') {
        // Configuração para Gmail
        // Melhoria: Preferir OAuth2 (clientId/secret/refreshToken) ao invés de App Password
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD, // Use App Password, não a senha normal
            },
        });
    } else if (emailProvider === 'sendgrid') {
        // Configuração para SendGrid
        // Melhoria: Suportar envio via API HTTP do SendGrid para maior performance e métricas
        transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY,
            },
        });
    } else if (emailProvider === 'smtp') {
        // Configuração SMTP genérica
        // Melhoria: expor opções TLS (rejectUnauthorized) e timeouts configuráveis
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    } else {
        // Fallback: modo de desenvolvimento (ethereal.email)
        logger.warn('emailService: Usando modo de desenvolvimento (Ethereal)');
        // Nota: Para usar Ethereal, você precisa criar uma conta em https://ethereal.email/
        // e configurar as credenciais nas variáveis de ambiente
        // Melhoria: criar automaticamente conta Ethereal em ambiente de dev (nodemailer.createTestAccount)
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: process.env.ETHEREAL_USER,
                pass: process.env.ETHEREAL_PASSWORD,
            },
        });
    }

    // Retorna a instância única para ser reutilizada pelas demais funções do serviço
    return transporter;
}

/**
 * Interface para dados do email
 * Representa os campos mínimos necessários para compor a mensagem
 * Melhoria: adicionar campos opcionais como cc, bcc, attachments, replyTo
 */
export interface EmailData {
    // Destinatário principal (email)
    to: string;
    // Assunto do email
    subject: string;
    // Corpo em texto plano (fallback para clientes sem HTML)
    text?: string;
    // Corpo em HTML (preferencial para melhor apresentação)
    html?: string;
}

/**
 * Envia um email genérico usando o transporter configurado
 * - Retorna true em caso de sucesso, false em caso de falha
 * Melhoria: lançar erros específicos para permitir tratamento granular no chamador
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
    try {
        // Obtém (ou inicializa) o transporter conforme o provedor escolhido
        const transport = getTransporter();

        // Definição das opções do email
        // Melhoria: permitir sobrescrever "from" por chamada e suportar cc/bcc/anexos
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER, // remetente padrão
            to: data.to, // destinatário
            subject: data.subject, // assunto
            text: data.text, // corpo em texto puro (fallback)
            html: data.html, // corpo em HTML (principal)
        };

        // Envia a mensagem e obtém informações do envio (ID da mensagem, resposta do servidor, etc.)
        const info = await transport.sendMail(mailOptions);

        // Log estruturado de sucesso de envio (útil para auditoria e suporte)
        logger.info('email.sent', {
            to: data.to,
            subject: data.subject,
            messageId: info.messageId,
        });

        // Log da URL de preview (útil em desenvolvimento com Ethereal)
        // Melhoria: condicionar também por EMAIL_PROVIDER === 'ethereal' para maior precisão
        if (process.env.NODE_ENV === 'development' && info.messageId) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                logger.info('email.preview', { url: previewUrl });
            }
        }

        return true;
    } catch (error) {
        // Log de erro com contexto mínimo
        // Melhoria: capturar códigos de erro do SMTP, classificar (transiente x permanente) e habilitar retries/backoff
        logger.error('email.error', {
            error: (error as Error).message,
            to: data.to,
        });
        return false;
    }
}

/**
 * Envia email de confirmação de cadastro para novos usuários
 * Parâmetros:
 * - userEmail: email do destinatário
 * - userName: nome do usuário para personalização
 * Melhoria: suportar i18n (traduções) e templates externos (ex: Handlebars, MJML)
 */
export async function sendRegistrationConfirmationEmail(
    userEmail: string,
    userName: string
): Promise<boolean> {
    // Assunto do email (pode conter emojis). 
    // Melhoria: externalizar para arquivo de tradução e permitir customização por tenant
    const subject = 'Bem-vindo ao App Lite! 🎉';

    // Versão em texto simples (acessibilidade e fallback)
    const text = `
Olá ${userName},

Seu cadastro foi realizado com sucesso!

Agora você pode fazer login e aproveitar todos os recursos da plataforma:
- Criar e gerenciar ofertas de serviços
- Buscar prestadores de serviços
- Conectar-se com outros usuários

Obrigado por se juntar a nós!

Equipe App Lite
    `.trim();

    // Versão em HTML (melhor apresentação visual)
    // Melhoria: mover para template engine (Handlebars/MJML) e inserir variáveis dinamicamente
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Bem-vindo ao App Lite!</h1>
    </div>
    <div class="content">
        <p>Olá <strong>${userName}</strong>,</p>
        
        <p>Seu cadastro foi realizado com sucesso!</p>
        
        <p>Agora você pode fazer login e aproveitar todos os recursos da plataforma:</p>
        
        <ul>
            <li>✅ Criar e gerenciar ofertas de serviços</li>
            <li>🔍 Buscar prestadores de serviços</li>
            <li>💬 Conectar-se com outros usuários</li>
            <li>⭐ Avaliar e ser avaliado</li>
        </ul>
        
        <p>Estamos felizes em tê-lo conosco!</p>
        
        <p><strong>Equipe App Lite</strong></p>
    </div>
    <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
    </div>
</body>
</html>
    `.trim();

    // Encaminha para a função genérica de envio
    return sendEmail({
        to: userEmail,
        subject,
        text,
        html,
    });
}

/**
 * Envia email com instruções para redefinição de senha
 * Parâmetros:
 * - userEmail: email do destinatário
 * - userName: nome do usuário para personalização
 * - resetToken: token único para validação da solicitação
 * Melhoria: usar token de uso único (one-time) curto + expiração configurável
 */
export async function sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string
): Promise<boolean> {
    // Monta a URL de redefinição usando a APP_URL de ambiente, com fallback local
    // Melhoria: preferir rotas com token curto e one-time; considerar deep link para app móvel
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Assunto do email de recuperação
    const subject = 'Recuperação de Senha - App Lite';

    // Versão em texto simples
    const text = `
Olá ${userName},

Recebemos uma solicitação para redefinir sua senha.

Clique no link abaixo para criar uma nova senha:
${resetUrl}

Este link expira em 1 hora.

Se você não solicitou a recuperação de senha, ignore este email.

Equipe App Lite
    `.trim();

    // Versão HTML com botão de ação
    // Melhoria: adicionar tracking de cliques (ex: UTM) e ID de correlação para suporte
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #667eea;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Recuperação de Senha</h1>
    </div>
    <div class="content">
        <p>Olá <strong>${userName}</strong>,</p>
        
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
        </p>
        
        <div class="warning">
            <strong>⚠️ Atenção:</strong>
            <ul>
                <li>Este link expira em <strong>1 hora</strong></li>
                <li>Se você não solicitou a recuperação de senha, ignore este email</li>
            </ul>
        </div>
        
        <p><strong>Equipe App Lite</strong></p>
    </div>
    <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
    </div>
</body>
</html>
    `.trim();

    // Encaminha para a função genérica de envio
    return sendEmail({
        to: userEmail,
        subject,
        text,
        html,
    });
}

// Objeto que consolida as funções do serviço de email
// Melhoria: considerar expor tipos e constantes auxiliares, se necessário
export const emailService = {
    sendEmail,
    sendRegistrationConfirmationEmail,
    sendPasswordResetEmail,
};

// Export default para facilitar importação em outras partes do projeto
export default emailService;

