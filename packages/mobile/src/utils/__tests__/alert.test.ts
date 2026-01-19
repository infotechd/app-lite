import { Platform, Alert } from 'react-native';
import { showDestructiveConfirm } from '../alert';
import { dialogManager } from '../dialogState';

// Mock minimalista para simular Web
jest.mock('react-native', () => ({
    Platform: {
        OS: 'web',
        select: jest.fn((dict) => dict.web || dict.default),
    },
    Alert: {
        alert: jest.fn(),
    },
}));

describe('Alert Utils (Web)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Limpar o estado do dialogManager se necessário
        dialogManager.handleConfirm(false);
    });

    it('deve usar o dialogManager na plataforma Web', async () => {
        const spy = jest.spyOn(dialogManager, 'show');
        
        // Chamada do alerta (sem await ainda para podermos simular a confirmação)
        const promise = showDestructiveConfirm('Título', 'Mensagem', 'Excluir', 'Cancelar');
        
        expect(spy).toHaveBeenCalledWith({
            title: 'Título',
            message: 'Mensagem',
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            isDestructive: true,
        });

        // Simula a confirmação do usuário através do dialogManager
        dialogManager.handleConfirm(true);
        
        const result = await promise;
        expect(result).toBe(true);
        
        spy.mockRestore();
    });

    it('deve retornar false quando o diálogo é cancelado na Web', async () => {
        const promise = showDestructiveConfirm('Título', 'Mensagem');
        
        // Simula o cancelamento do usuário
        dialogManager.handleConfirm(false);
        
        const result = await promise;
        expect(result).toBe(false);
    });
});
