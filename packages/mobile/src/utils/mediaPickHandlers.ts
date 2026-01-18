// Tratamento centralizado do resultado do seletor de mídia para evitar duplicação entre telas
// Segue as diretrizes do projeto: TypeScript estrito, tratamento de erros e utilitários reutilizáveis

import { Linking } from 'react-native';
import { showAlert, showConfirm } from '@/utils/alert';
import { OFERTA_MEDIA_CONFIG } from '@/utils/validation';

/**
 * Representa o resultado padronizado retornado pelo serviço de seleção de mídia (ex.: câmera/galeria).
 * Mantenha esta interface alinhada ao que é retornado pelo serviço `pickMedia`.
 *
 * @template TFile Tipo do objeto de arquivo retornado pelo seletor de mídia.
 * @property {boolean} [permissionDenied] Indica se o usuário negou as permissões necessárias.
 * @property {TFile[]} files Lista de arquivos selecionados com sucesso (pode estar vazia).
 * @property {string[]} [warnings] Mensagens de aviso sobre arquivos ignorados ou problemas não críticos.
 * @property {boolean} [truncated] Indica se a seleção foi truncada por atingir um limite de quantidade.
 */
export interface MediaPickResult<TFile = any> {
    permissionDenied?: boolean;
    files: TFile[];
    warnings?: string[];
    truncated?: boolean;
}

/**
 * Trata o resultado do seletor de mídia de forma consistente em todo o app.
 * - Exibe alerta de permissão e abre as configurações do sistema quando necessário.
 * - Entrega os arquivos selecionados via callback `onFiles`.
 * - Exibe avisos e alerta quando a seleção é truncada por limite.
 *
 * Efeitos colaterais:
 * - Pode exibir Alertas nativos (via `showAlert`).
 * - Pode abrir as configurações do sistema (via `Linking.openSettings`).
 *
 * @template TFile Tipo do objeto de arquivo retornado pelo seletor de mídia.
 * @param {MediaPickResult<TFile>} res Resultado retornado pelo seletor de mídia.
 * @param {(files: TFile[]) => void} onFiles Callback para aplicar os arquivos selecionados no estado/componente.
 * @param {number} [maxFiles=OFERTA_MEDIA_CONFIG.MAX_FILES] Quantidade máxima de arquivos permitida para informar no alerta de truncamento.
 * @returns {Promise<void>} Não retorna valor; exibe alertas e invoca o callback `onFiles`.
 */
export async function handleMediaPickResult<TFile = any>(
    res: MediaPickResult<TFile>,
    onFiles: (files: TFile[]) => void,
    maxFiles: number = OFERTA_MEDIA_CONFIG.MAX_FILES
): Promise<void> {
    // 1) Se o usuário negou a permissão, informar e oferecer atalho para as configurações do sistema
    if (res.permissionDenied === true) {
        const openSettings = await showConfirm(
            'Permissão necessária',
            'Precisamos de acesso à sua galeria para selecionar imagens ou vídeos.',
            'Abrir ajustes',
            'Cancelar'
        );
        if (openSettings) {
            Linking.openSettings();
        }
        return;
    }

    // 2) Aplicar os arquivos selecionados (se vier nulo/indefinido, usa lista vazia)
    onFiles(res.files ?? []);

    // 3) Exibir quaisquer avisos coletados (ex.: arquivos de tipo inválido ignorados)
    const warnings = res.warnings ?? [];
    if (Array.isArray(warnings) && warnings.length) {
        showAlert('Alguns arquivos foram ignorados', warnings.join('\n'));
    }

    // 4) Informar o usuário se a seleção foi truncada devido ao limite de arquivos
    if (res.truncated === true) {
        showAlert('Limite de arquivos', `Apenas os primeiros ${maxFiles} arquivos foram adicionados.`);
    }
}
