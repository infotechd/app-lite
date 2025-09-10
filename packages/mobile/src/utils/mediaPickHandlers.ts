// Centralized media picker result handling to avoid duplication across screens
// Follows project guidelines: TypeScript strict, error handling, and reusable utils

import { Alert, Linking } from 'react-native';
import { OFERTA_MEDIA_CONFIG } from '@/utils/validation';

// Keep this interface aligned with the result returned by pickMedia service
export interface MediaPickResult<TFile = any> {
    permissionDenied?: boolean;
    files: TFile[];
    warnings?: string[];
    truncated?: boolean;
}

/**
 * Handle a media picker result in a consistent way across the app.
 * - Shows permission alert and opens system settings if needed
 * - Applies files via callback
 * - Shows warnings and truncated alerts
 */
export function handleMediaPickResult<TFile = any>(
    res: MediaPickResult<TFile>,
    onFiles: (files: TFile[]) => void,
    maxFiles: number = OFERTA_MEDIA_CONFIG.MAX_FILES
): void {
    if (res.permissionDenied === true) {
        Alert.alert(
            'Permissão necessária',
            'Precisamos de acesso à sua galeria para selecionar imagens ou vídeos.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
            ]
        );
        return;
    }

    // Apply selected files
    onFiles(res.files ?? []);

    // Show any collected warnings
    const warnings = res.warnings ?? [];
    if (Array.isArray(warnings) && warnings.length) {
        Alert.alert('Alguns arquivos foram ignorados', warnings.join('\n'));
    }

    // Inform user if the selection was truncated by a limit
    if (res.truncated === true) {
        Alert.alert('Limite de arquivos', `Apenas os primeiros ${maxFiles} arquivos foram adicionados.`);
    }
}
