import React from 'react';
import { Modal, View, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './MediaPreviewOverlay.styles';

/**
 * Propriedades do componente MediaPreviewOverlay.
 * Representa o overlay/modal para pré-visualização de uma mídia e ações associadas.
 *
 * @property mediaUri URI da mídia a ser exibida. Quando for `null`, o overlay não será renderizado.
 * @property onClose Função chamada ao fechar o overlay (botão voltar ou gesto do sistema).
 * @property onDelete Função chamada ao solicitar a exclusão da mídia atual.
 */
interface MediaPreviewOverlayProps {
    mediaUri: string | null;
    onClose: () => void;
    onDelete: () => void;
}

/**
 * Componente de overlay para pré-visualização de mídia (imagem), exibido dentro de um `Modal` transparente.
 * Renderiza botões de fechar (voltar) e excluir, além da imagem selecionada.
 * Usa retorno antecipado (early return) para não montar o `Modal` quando não há mídia.
 *
 * @param mediaUri URI da mídia a ser exibida. Quando ausente/`null`, nada é renderizado.
 * @param onClose Callback disparado quando o usuário fecha o overlay.
 * @param onDelete Callback disparado quando o usuário solicita a exclusão da mídia atual.
 * @returns JSX.Element | null Retorna o `Modal` com a pré-visualização quando há mídia; caso contrário, `null`.
 */
const MediaPreviewOverlay: React.FC<MediaPreviewOverlayProps> = ({ mediaUri, onClose, onDelete }) => {
    // Não renderiza o overlay se não houver uma mídia selecionada.
    if (!mediaUri) {
        return null;
    }

    return (
        <Modal
            // Modal transparente para sobrepor a tela atual mantendo o fundo visível.
            transparent={true}
            // Animação suave de aparecimento/desaparecimento.
            animationType="fade"
            visible={!!mediaUri}
            // Necessário no Android: chamado ao pressionar o botão de "voltar" do sistema.
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                {/* Botão para fechar/voltar do overlay */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="arrow-back" size={30} color="white" />
                </TouchableOpacity>
                {/* Botão para excluir a mídia atual */}
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                    <Ionicons name="trash" size={30} color="white" />
                </TouchableOpacity>
                {/* Container que centraliza e limita a área da mídia */}
                <View style={styles.mediaContainer}>
                    {/* Exibe a imagem a partir do URI fornecido */}
                    <Image source={{ uri: mediaUri }} style={styles.media} />
                </View>
            </View>
        </Modal>
    );
};

export default MediaPreviewOverlay;

