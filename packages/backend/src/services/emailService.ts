import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { z } from 'zod';
import logger from '../utils/logger';

/**
 * Esquema de validação para as variáveis de ambiente relacionadas ao serviço de e-mail.
 * Utiliza a biblioteca Zod para garantir que as configurações necessárias (SMTP, Host, etc.)
 * estejam presentes e no formato correto antes da aplicação iniciar.
 */
const emailEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('noreply@applite.com'),
});

/** Instância validada das variáveis de ambiente */
const env = emailEnvSchema.parse(process.env);

/**
 * @class EmailService
 * @description Serviço responsável pelo gerenciamento, configuração e disparo de e-mails da aplicação.
 * Implementa um padrão Singleton para garantir que o transportador de e-mail seja reutilizado.
 */
class EmailService {
    /** Instância do transportador do nodemailer (SMTP) */
    private transporter: Transporter | null = null;

    /**
     * @constructor
     * Inicializa a classe e dispara a configuração assíncrona do transportador.
     */
    constructor() {
        // Dispara a inicialização sem bloquear o thread principal
        void this.initializeTransporter();
    }

    /**
     * @private
     * @async
     * @method initializeTransporter
     * @description Configura o transportador de e-mail. 
     * RESOLUÇÃO DO PROBLEMA: Esta função foi ajustada para priorizar credenciais SMTP reais 
     * definidas no .env, mesmo que o ambiente seja 'development', evitando que e-mails fiquem 
     * presos apenas no Ethereal (modo de teste).
     * @returns {Promise<void>}
     */
    private async initializeTransporter(): Promise<void> {
        try {
            // REGRA DE NEGÓCIO: Se houver HOST e PASS configurados no .env, usamos o SMTP Real.
            // Isso resolve o problema de não receber e-mails reais durante o desenvolvimento.
            if (env.SMTP_HOST && env.SMTP_PASS) {
                this.transporter = nodemailer.createTransport({
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT || 465,
                    // Se a porta for 465, secure deve ser true. Para 587 (TLS), false.
                    secure: (env.SMTP_PORT || 465) === 465,
                    auth: { 
                        user: env.SMTP_USER, 
                        pass: env.SMTP_PASS 
                    },
                });
                logger.info(`📧 Email Service: SMTP Real (${env.SMTP_HOST}) iniciado.`);
            } 
            // FALLBACK: Se não houver SMTP configurado, usa o Ethereal apenas em ambiente de teste/dev
            else if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: { user: testAccount.user, pass: testAccount.pass },
                });
                logger.info('📧 Email Service: Modo Dev/Test (Ethereal) iniciado. Verifique os logs para a URL de preview.');
            } 
            // ERRO: Em produção, o serviço não inicia sem as credenciais corretas
            else {
                logger.warn('⚠️ Email Service: Credenciais de Produção ausentes no .env.');
                this.transporter = null;
            }
        } catch (error) {
            logger.error('❌ Falha ao iniciar serviço de email:', error);
            this.transporter = null;
        }
    }

    /**
     * @private
     * @async
     * @method sendInternal
     * @description Método interno que executa o envio do e-mail via nodemailer.
     * @param {SendMailOptions} options - Objeto contendo remetente, destinatário, assunto e conteúdo.
     * @throws {Error} Lança erro caso o envio falhe para tratamento no nível superior.
     * @returns {Promise<void>}
     */
    private async sendInternal(options: SendMailOptions): Promise<void> {
        // Tenta inicializar caso o transportador ainda não exista
        if (!this.transporter) await this.initializeTransporter();
        if (!this.transporter) {
            throw new Error('Serviço de e-mail não disponível (transportador não configurado).');
        }

        try {
            const info = await this.transporter.sendMail(options);
            
            // Log especial para debug em ambiente de desenvolvimento (URL do Ethereal)
            if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const preview = nodemailer.getTestMessageUrl(info);
                if (preview) logger.info(`📨 Preview do Email: ${preview}`);
            } else {
                logger.info(`📨 Email enviado: ${info.messageId}`);
            }
        } catch (error) {
            logger.error(`❌ Erro no envio para ${String(options.to)}:`, error);
            throw error; // Propaga o erro para ser capturado no Controller
        }
    }

    /**
     * @public
     * @async
     * @method sendWelcomeEmail
     * @description Formata e envia o e-mail de boas-vindas para novos usuários cadastrados.
     * @param {string} to - E-mail de destino do usuário.
     * @param {string} userName - Nome do usuário para saudação personalizada.
     * @returns {Promise<void>}
     */
    public async sendWelcomeEmail(to: string, userName: string): Promise<void> {
        // Template HTML básico do e-mail
        const htmlContent = `
      <div style="font-family: sans-serif; color: #333; padding: 20px;">
        <h2>Bem-vindo ao App Lite, ${userName}! 🚀</h2>
        <p>Sua conta foi criada com sucesso em nossa plataforma.</p>
        <p>Estamos muito felizes em ter você conosco!</p>
        <br />
        <small>Este é um e-mail automático, por favor não responda.</small>
      </div>
    `;

        // Executa o envio
        await this.send({
            to,
            subject: 'Bem-vindo ao App Lite!',
            html: htmlContent,
        });
    }

    /**
     * @public
     * @async
     * @method send
     * @description Método público que permite o envio de e-mails personalizados (ex: token de confirmação).
     * @param {SendMailOptions} options - Objeto contendo remetente, destinatário, assunto e conteúdo.
     * @returns {Promise<void>}
     */
    public async send(options: SendMailOptions): Promise<void> {
        return this.sendInternal({
            from: `"App Lite" <${env.EMAIL_FROM}>`,
            ...options,
        });
    }
}

/** Exportação da instância única do serviço (Singleton) */
export const emailService = new EmailService();
export default emailService;

