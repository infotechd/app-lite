import { Platform } from 'react-native';

/**
 * Interface que define o estado de um diálogo global.
 */
interface DialogState {
    visible: boolean;
    title: string;
    message?: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    resolve?: (value: boolean) => void;
}

type DialogListener = (state: DialogState) => void;

/**
 * Gerenciador de estado para diálogos que podem ser chamados de forma imperativa.
 * Permite que funções utilitárias (fora do ciclo de vida do React) disparem diálogos na UI.
 */
class DialogManager {
    private state: DialogState = {
        visible: false,
        title: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        isDestructive: false,
    };

    private listeners: Set<DialogListener> = new Set();

    /**
     * Inscreve um componente para ouvir mudanças no estado do diálogo.
     */
    subscribe(listener: DialogListener) {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Exibe um diálogo e retorna uma Promise que resolve com a ação do usuário.
     */
    show(options: Omit<DialogState, 'visible' | 'resolve'>): Promise<boolean> {
        return new Promise((resolve) => {
            this.state = {
                ...options,
                visible: true,
                resolve: (val) => {
                    this.state.visible = false;
                    this.notify();
                    resolve(val);
                }
            };
            this.notify();
        });
    }

    /**
     * Fecha o diálogo atual com um valor específico.
     */
    handleConfirm(value: boolean) {
        if (this.state.resolve) {
            this.state.resolve(value);
        }
    }

    getState() {
        return this.state;
    }
}

export const dialogManager = new DialogManager();
