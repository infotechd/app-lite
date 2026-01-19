/**
 * Utilitário de Alert cross-platform
 * 
 * O Alert.alert() do React Native não funciona na web.
 * Este módulo fornece uma implementação que funciona em todas as plataformas.
 */

import { Alert as RNAlert, Platform } from 'react-native';
import { dialogManager } from './dialogState';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Exibe um alerta de forma cross-platform.
 * - No mobile (iOS/Android): usa Alert.alert() nativo
 * - Na web: usa window.confirm() ou window.alert()
 * 
 * @param title Título do alerta
 * @param message Mensagem do alerta
 * @param buttons Array de botões (opcional)
 */
export const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[]
): void => {
    if (Platform.OS === 'web') {
        // Usamos o dialogManager para evitar window.alert/confirm que podem ser bloqueados
        const confirmButton = buttons?.find(b => b.style !== 'cancel') || buttons?.[0];
        const cancelButton = buttons?.find(b => b.style === 'cancel');

        dialogManager.show({
            title,
            message,
            confirmText: confirmButton?.text || 'OK',
            cancelText: cancelButton?.text || 'Cancelar',
            isDestructive: confirmButton?.style === 'destructive'
        }).then(confirmed => {
            if (confirmed && confirmButton?.onPress) {
                confirmButton.onPress();
            } else if (!confirmed && cancelButton?.onPress) {
                cancelButton.onPress();
            }
        });
    } else {
        // No mobile, usa o Alert nativo
        RNAlert.alert(title, message, buttons);
    }
};

/**
 * Exibe um diálogo de confirmação cross-platform.
 * Retorna uma Promise que resolve para true (confirmado) ou false (cancelado).
 * 
 * @param title Título do diálogo
 * @param message Mensagem do diálogo
 * @param confirmText Texto do botão de confirmação (padrão: "Confirmar")
 * @param cancelText Texto do botão de cancelamento (padrão: "Cancelar")
 */
export const showConfirm = (
    title: string,
    message?: string,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
): Promise<boolean> => {
    if (Platform.OS === 'web') {
        return dialogManager.show({
            title,
            message,
            confirmText,
            cancelText,
            isDestructive: false
        });
    }

    return new Promise((resolve) => {
        RNAlert.alert(
            title,
            message,
            [
                { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
                { text: confirmText, onPress: () => resolve(true) },
            ]
        );
    });
};

/**
 * Exibe um diálogo de confirmação destrutiva (ex: exclusão).
 * 
 * @param title Título do diálogo
 * @param message Mensagem do diálogo
 * @param destructiveText Texto do botão destrutivo (padrão: "Excluir")
 * @param cancelText Texto do botão de cancelamento (padrão: "Cancelar")
 */
export const showDestructiveConfirm = (
    title: string,
    message?: string,
    destructiveText = 'Excluir',
    cancelText = 'Cancelar'
): Promise<boolean> => {
    if (Platform.OS === 'web') {
        return dialogManager.show({
            title,
            message,
            confirmText: destructiveText,
            cancelText,
            isDestructive: true
        });
    }

    return new Promise((resolve) => {
        RNAlert.alert(
            title,
            message,
            [
                { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
                { text: destructiveText, style: 'destructive', onPress: () => resolve(true) },
            ]
        );
    });
};

export default { showAlert, showConfirm, showDestructiveConfirm };
