import React, { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { dialogManager } from '../../utils/dialogState';
import { colors } from '../../styles/theme';

/**
 * Componente de diálogo global que escuta o `dialogManager`.
 * Deve ser renderizado no root da aplicação para capturar solicitações
 * de diálogos imperativos (especialmente úteis na Web).
 */
export const GlobalDialog: React.FC = () => {
    const [state, setState] = useState(dialogManager.getState());

    useEffect(() => {
        // Inscreve-se para atualizações de estado do gerenciador
        const unsubscribe = dialogManager.subscribe((newState) => {
            setState({ ...newState });
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const { visible, title, message, confirmText, cancelText, isDestructive } = state;

    // Usar referências locais para subcomponentes do Dialog para melhor compatibilidade com mocks
    const DialogTitle = Dialog.Title;
    const DialogContent = Dialog.Content;
    const DialogActions = Dialog.Actions;

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={() => dialogManager.handleConfirm(false)}>
                {DialogTitle && <DialogTitle>{title}</DialogTitle>}
                {DialogContent && (
                    <DialogContent>
                        {!!message && <Text variant="bodyMedium">{message}</Text>}
                    </DialogContent>
                )}
                {DialogActions && (
                    <DialogActions>
                        <Button onPress={() => dialogManager.handleConfirm(false)}>
                            {cancelText}
                        </Button>
                        <Button 
                            onPress={() => dialogManager.handleConfirm(true)}
                            textColor={isDestructive ? colors.error : colors.primary}
                        >
                            {confirmText}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </Portal>
    );
};
