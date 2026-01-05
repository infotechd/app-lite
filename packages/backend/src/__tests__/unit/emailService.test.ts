import nodemailer from 'nodemailer';

// Mock do nodemailer ANTES de importar o serviço
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
    createTestAccount: jest.fn(),
    getTestMessageUrl: jest.fn(),
}));

describe('EmailService', () => {
    let emailService: any;
    let mockSendMail: jest.Mock;
    let mockTransporter: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
        mockTransporter = {
            sendMail: mockSendMail,
        };

        (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
        (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
            user: 'testuser',
            pass: 'testpass',
        });
        (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue('http://preview.url');

        // Importa o serviço dentro do beforeEach para garantir que o mock seja aplicado
        // e que cada teste possa ter uma instância "limpa" (se resetarmos os módulos)
        jest.isolateModules(() => {
            const mod = require('../../services/emailService');
            emailService = mod.emailService;
        });
    });

    it('deve formatar e enviar o email de boas-vindas corretamente', async () => {
        const to = 'usuario@teste.com';
        const userName = 'João Silva';

        await emailService.sendWelcomeEmail(to, userName);

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: to,
            subject: 'Bem-vindo ao App Lite!',
            html: expect.stringContaining(`Bem-vindo ao App Lite, ${userName}!`),
            from: expect.stringContaining('App Lite'),
        }));
    });

    it('deve lançar erro se o transporte falhar ao enviar o email', async () => {
        mockSendMail.mockRejectedValue(new Error('Falha no envio'));

        const to = 'usuario@teste.com';
        const userName = 'João Silva';

        await expect(emailService.sendWelcomeEmail(to, userName)).rejects.toThrow('Falha no envio');
    });

    it('deve inicializar o Ethereal se credenciais SMTP não forem fornecidas', async () => {
        // Limpar variáveis de ambiente SMTP
        const originalEnv = { ...process.env };
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_PASS;
        process.env.NODE_ENV = 'test';

        let service: any;
        jest.isolateModules(() => {
            const mod = require('../../services/emailService');
            service = mod.emailService;
        });

        // O initializeTransporter é chamado no constructor, mas é async.
        // Para garantir que ele rodou, podemos chamar o send (que aguarda o initialize se necessário)
        // Ou simplesmente esperar um pouco. Mas o melhor é chamar send.
        
        await service.sendWelcomeEmail('test@test.com', 'Test');

        expect(nodemailer.createTestAccount).toHaveBeenCalled();
        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.ethereal.email'
        }));

        // Restaurar env
        process.env = originalEnv;
    });
});
