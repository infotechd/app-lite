/**
 * Estilos do overlay de pré-visualização de mídia no aplicativo mobile.
 *
 * Este arquivo centraliza os estilos utilizados pelo componente de overlay
 * responsável por exibir imagens/vídeos em tela cheia, com fundo escurecido
 * e botões de ação (fechar/excluir) posicionados nos cantos superiores.
 */
import { StyleSheet, Dimensions } from 'react-native';

// Obtém as dimensões atuais da janela para que o container de mídia ocupe
// exatamente a largura e a altura da tela do dispositivo.
const { width, height } = Dimensions.get('window');

/**
 * Conjunto de estilos para o overlay de pré-visualização de mídia.
 *
 * Mapeamento das chaves:
 * - modalContainer: Container principal do modal (tela cheia, fundo escurecido, conteúdo centralizado).
 * - mediaContainer: Área que ocupa toda a tela e centraliza a mídia.
 * - media: Elemento de mídia (imagem/vídeo) ajustado para conter sem distorcer.
 * - closeButton: Botão de fechar posicionado no canto superior esquerdo.
 * - deleteButton: Botão de exclusão posicionado no canto superior direito.
 *
 * @returns StyleSheet.NamedStyles<{
 *   modalContainer: object;
 *   mediaContainer: object;
 *   media: object;
 *   closeButton: object;
 *   deleteButton: object;
 * }>
 */
export const styles = StyleSheet.create({
    modalContainer: {
        flex: 1, // ocupa toda a área disponível do modal (tela cheia)
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // fundo escuro com alta opacidade para destacar a mídia
        justifyContent: 'center', // centraliza verticalmente o conteúdo
        alignItems: 'center', // centraliza horizontalmente o conteúdo
    },
    mediaContainer: {
        width: width, // utiliza a largura exata da tela
        height: height, // utiliza a altura exata da tela
        justifyContent: 'center', // mantém a mídia centralizada verticalmente
        alignItems: 'center', // mantém a mídia centralizada horizontalmente
    },
    media: {
        width: '100%', // preenche toda a largura do container
        height: '100%', // preenche toda a altura do container
        resizeMode: 'contain', // garante que a mídia caiba na tela sem cortar ou distorcer
    },
    closeButton: {
        position: 'absolute', // posicionamento flutuante sobre o conteúdo
        top: 40, // distância do topo para evitar sobreposição com status bar
        left: 20, // alinhado à esquerda
        zIndex: 1, // garante que o botão fique acima da mídia
    },
    deleteButton: {
        position: 'absolute', // posicionamento flutuante sobre o conteúdo
        top: 40, // mesma altura do botão de fechar para consistência visual
        right: 20, // alinhado à direita
        zIndex: 1, // garante que o botão fique acima da mídia
    },
});

