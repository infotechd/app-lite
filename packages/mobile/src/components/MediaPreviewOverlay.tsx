import React from 'react';
import { Modal, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './MediaPreviewOverlay.styles';
import { MediaFile } from '@/types/media';
import VideoPlayer from '@/components/common/VideoPlayer';

/**
 * Propriedades do componente MediaPreviewOverlay.
 * Representa o overlay/modal para pré-visualização de uma mídia e ações associadas.
 *
 * @property media Objeto da mídia a ser exibida. Quando for `null`, o overlay não será renderizado.
 * @property onClose Função chamada ao fechar o overlay (botão voltar ou gesto do sistema).
 * @property onDelete Função chamada ao solicitar a exclusão da mídia atual.
 */
interface MediaPreviewOverlayProps {
    media: MediaFile | null;
    onClose: () => void;
    onDelete: () => void;
}

/**
 * Componente de overlay para pré-visualização de mídia (imagem/vídeo), exibido dentro de um `Modal` transparente.
 * Renderiza botões de fechar (voltar) e excluir, além da mídia selecionada.
 * Usa retorno antecipado (early return) para não montar o `Modal` quando não há mídia.
 *
 * @param media Objeto da mídia a ser exibida. Quando ausente/`null`, nada é renderizado.
 * @param onClose Callback disparado quando o usuário fecha o overlay.
 * @param onDelete Callback disparado quando o usuário solicita a exclusão da mídia atual.
 * @returns JSX.Element | null Retorna o `Modal` com a pré-visualização quando há mídia; caso contrário, `null`.
 */
/**
 * Overlay de pré-visualização de mídia (imagem/vídeo).
 *
 * Exibe um modal em tela cheia com a mídia selecionada e dois botões de ação: voltar/fechar e excluir.
 * O componente é controlado externamente via prop `media`: quando `null`, nada é renderizado; quando
 * há um objeto válido, o modal fica visível apresentando a mídia.
 *
 * @param media Objeto de mídia a ser exibido (contém pelo menos `uri` e `type`). Quando `null`, o modal é ocultado.
 * @param onClose Função chamada ao fechar o overlay (seta `media` para `null` no componente pai, tipicamente).
 * @param onDelete Função chamada ao solicitar exclusão do item atualmente pré-visualizado.
 * @returns JSX.Element | null
 */
const MediaPreviewOverlay: React.FC<MediaPreviewOverlayProps> = ({ media, onClose, onDelete }) => {
    // Não renderiza o overlay se não houver uma mídia selecionada.
    if (!media) {
        return null;
    }

    return (
        <Modal
            // Modal transparente para sobrepor a tela atual mantendo o fundo visível.
            transparent={true}
            // Animação suave de aparecimento/desaparecimento.
            animationType="fade"
            visible={!!media}
            // Necessário no Android: chamado ao pressionar o botão de "voltar" do sistema.
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
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
                    {/* Renderiza vídeo em tela cheia ou imagem, conforme o tipo */}
                    {media.type?.startsWith('video/') || media.type === 'video' ? (
                        <VideoPlayer uri={media.uri} style={styles.media} />
                    ) : (
                        <Image source={{ uri: media.uri }} style={styles.media} resizeMode="contain" />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

export default MediaPreviewOverlay;

