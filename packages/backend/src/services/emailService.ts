import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { z } from 'zod';
import logger from '../utils/logger';

const emailEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('noreply@applite.com'),
});

const env = emailEnvSchema.parse(process.env);

class EmailService {
    private transporter: Transporter | null = null;

    constructor() {
        void this.initializeTransporter();
    }

    private async initializeTransporter(): Promise<void> {
        try {
            if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: { user: testAccount.user, pass: testAccount.pass },
                });
                logger.info('📧 Email Service: Modo Dev/Test (Ethereal) iniciado.');
            } else {
                if (!env.SMTP_HOST || !env.SMTP_PASS) {
                    logger.warn('⚠️ Email Service: Credenciais de Prod ausentes.');
                    this.transporter = null;
                    return;
                }
                this.transporter = nodemailer.createTransport({
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT || 465,
                    secure: (env.SMTP_PORT || 465) === 465,
                    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
                });
                logger.info(`📧 Email Service: Modo Prod (${env.SMTP_HOST}) iniciado.`);
            }
        } catch (error) {
            logger.error('❌ Falha ao iniciar serviço de email:', error);
            this.transporter = null;
        }
    }

    private async send(options: SendMailOptions): Promise<void> {
        if (!this.transporter) await this.initializeTransporter();
        if (!this.transporter) return;

        try {
            const info = await this.transporter.sendMail(options);
            if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const preview = nodemailer.getTestMessageUrl(info);
                if (preview) logger.info(`📨 Preview URL: ${preview}`);
            } else {
                logger.info(`📨 Email enviado: ${info.messageId}`);
            }
        } catch (error) {
            logger.error(`❌ Erro ao enviar email para ${String(options.to)}:`, error);
        }
    }

    public async sendWelcomeEmail(to: string, userName: string): Promise<void> {
        const htmlContent = `
      <div style="font-family: sans-serif;">
        <h2>Bem-vindo, ${userName}! 🚀</h2>
        <p>A sua conta no App Lite foi criada.</p>
      </div>
    `;

        await this.send({
            from: `"App Lite" <${env.EMAIL_FROM}>`,
            to,
            subject: 'Bem-vindo ao App Lite!',
            html: htmlContent,
        });
    }
}

export const emailService = new EmailService();
export default emailService;

