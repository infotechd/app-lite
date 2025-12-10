/**
 * Componente de Menu de Opções de Mídia
 *
 * Exibe um menu elegante com 4 opções:
 * - Tirar Foto
 * - Gravar Vídeo
 * - Escolher Foto
 * - Escolher Vídeo
 *
 * Observação: Este arquivo contém comentários detalhados em Português (pt-BR),
 * usando TSDoc/JSDoc acima das funções e comentários inline para auxiliar a manutenção.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, List, Divider } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

/**
 * Propriedades esperadas pelo componente MediaOptionsMenu.
 */
interface MediaOptionsMenuProps {
    /** Define se o modal está visível. */
    visible: boolean;
    /** Callback para fechar o modal. */
    onDismiss: () => void;
    /** Ação para abrir a câmera e tirar foto. */
    onTakePhoto: () => void;
    /** Ação para abrir a câmera e gravar vídeo. */
    onRecordVideo: () => void;
    /** Ação para abrir o seletor de mídia para escolher foto. */
    onPickPhoto: () => void;
    /** Ação para abrir o seletor de mídia para escolher vídeo. */
    onPickVideo: () => void;
}

/**
 * Componente funcional que apresenta um Modal com quatro opções de mídia.
 *
 * O conteúdo é renderizado dentro de um Portal do react-native-paper para garantir
 * que o modal apareça sobre toda a interface. Cada ação fecha o modal e executa
 * a função correspondente com um pequeno atraso para preservar a fluidez da animação.
 *
 * @param props Objeto de propriedades do componente.
 * @param props.visible Indica se o modal deve ser exibido.
 * @param props.onDismiss Função chamada para fechar o modal.
 * @param props.onTakePhoto Função chamada quando o usuário escolhe "Tirar Foto".
 * @param props.onRecordVideo Função chamada quando o usuário escolhe "Gravar Vídeo".
 * @param props.onPickPhoto Função chamada quando o usuário escolhe "Escolher Foto".
 * @param props.onPickVideo Função chamada quando o usuário escolhe "Escolher Vídeo".
 * @returns Elemento React que representa o modal de opções de mídia.
 */
const MediaOptionsMenu: React.FC<MediaOptionsMenuProps> = ({
                                                               visible,
                                                               onDismiss,
                                                               onTakePhoto,
                                                               onRecordVideo,
                                                               onPickPhoto,
                                                               onPickVideo,
                                                           }) => {
    /**
     * Fecha o modal e, após um pequeno atraso, executa a ação escolhida.
     * O atraso (100ms) ajuda a evitar cortes na animação de fechamento do Modal
     * e dá tempo para a transição terminar antes de abrir câmera/galeria.
     *
     * @param callback Função a ser chamada após o fechamento do modal.
     * @returns void
     */
    const handleOption = (callback: () => void) => {
        onDismiss();
        // Pequeno delay para suavizar a transição do modal antes de abrir a próxima tela
        setTimeout(callback, 100);
    };

    return (
        // Portal garante que o Modal seja renderizado acima de todo o app
        <Portal>
            <Modal
                // Controla a visibilidade do modal
                visible={visible}
                // Chamado ao tocar fora/voltar; fecha o modal
                onDismiss={onDismiss}
                // Estilos de container do próprio conteúdo do modal
                contentContainerStyle={styles.modal}
            >
                <View style={styles.container}>
                    {/* Cabeçalho do modal */}
                    <Text variant="titleMedium" style={styles.title}>
                        Adicionar Mídia
                    </Text>
                    <Text variant="bodySmall" style={styles.subtitle}>
                        Escolha uma opção para adicionar fotos ou vídeos
                    </Text>

                    <Divider style={styles.divider} />

                    {/* Opção: Tirar Foto (usa a câmera para capturar uma imagem) */}
                    <List.Item
                        title="Tirar Foto"
                        description="Usar câmera para foto"
                        left={(props) => <List.Icon {...props} icon="camera" />}
                        onPress={() => handleOption(onTakePhoto)}
                        style={styles.listItem}
                    />

                    {/* Opção: Gravar Vídeo (usa a câmera, com limite sugerido de 20s) */}
                    <List.Item
                        title="Gravar Vídeo"
                        description="Usar câmera para vídeo (até 20s)"
                        left={(props) => <List.Icon {...props} icon="video" />}
                        onPress={() => handleOption(onRecordVideo)}
                        style={styles.listItem}
                    />

                    <Divider style={styles.divider} />

                    {/* Opção: Escolher Foto (abre a galeria para selecionar imagem) */}
                    <List.Item
                        title="Escolher Foto"
                        description="Selecionar da galeria"
                        left={(props) => <List.Icon {...props} icon="image" />}
                        onPress={() => handleOption(onPickPhoto)}
                        style={styles.listItem}
                    />

                    {/* Opção: Escolher Vídeo (abre a galeria para selecionar vídeo) */}
                    <List.Item
                        title="Escolher Vídeo"
                        description="Selecionar da galeria"
                        left={(props) => <List.Icon {...props} icon="video-box" />}
                        onPress={() => handleOption(onPickVideo)}
                        style={styles.listItem}
                    />
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    // Estilos do container do conteúdo dentro do Modal
    modal: {
        backgroundColor: colors.background,
        margin: spacing.lg, // margem externa para não encostar nas bordas da tela
        borderRadius: 12, // cantos arredondados para um visual mais moderno
        maxWidth: 500, // limita largura em telas grandes (tablets)
        alignSelf: 'center', // centraliza horizontalmente
        width: '100%', // ocupa toda a largura disponível até o maxWidth
    },
    // Container principal do conteúdo do modal
    container: {
        padding: spacing.md, // espaçamento interno padrão
    },
    // Estilo do título do modal
    title: {
        textAlign: 'center',
        marginBottom: spacing.xs,
        color: colors.text,
    },
    // Estilo do subtítulo/descrição do modal
    subtitle: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    // Espaçamento dos divisores que separam grupos de opções
    divider: {
        marginVertical: spacing.xs,
    },
    // Remove padding horizontal dos itens para alinhar com o layout interno
    listItem: {
        paddingHorizontal: 0,
    },
});

export default MediaOptionsMenu;
