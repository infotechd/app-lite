import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

/**
 * Propriedades aceitas pelo componente `VideoPlayer`.
 *
 * Este componente exibe um player de vídeo usando a biblioteca `expo-video`.
 * A fonte do vídeo é definida por meio de uma URI (local ou remota).
 *
 * @property uri - Endereço (URI) do arquivo de vídeo a ser reproduzido. Pode ser uma URL remota ou um caminho local.
 */
interface VideoPlayerProps {
    uri: string;
}

/**
 * Componente de player de vídeo reutilizável baseado em `expo-video`.
 *
 * - Inicializa um player via hook `useVideoPlayer`, habilitando loop contínuo e som ligado por padrão.
 * - Renderiza o `VideoView` com controles nativos do SO e ajuste de conteúdo "contain" (mantém proporção sem cortar).
 * - O tamanho padrão é 150x150 com cantos arredondados; pode ser ajustado conforme necessidade.
 *
 * Detalhes de comportamento:
 * - `loop`: quando verdadeiro, o vídeo reinicia automaticamente ao terminar.
 * - `muted`: quando falso, o áudio é reproduzido (respeitando o estado de volume do dispositivo).
 * - `nativeControls`: mostra os controles padrão do player (play/pause, barra de progresso etc.).
 * - `contentFit="contain"`: garante que todo o vídeo seja visível dentro do contêiner sem distorção.
 *
 * @param param0 - Objeto de propriedades do componente.
 * @param param0.uri - URI do vídeo a ser reproduzido.
 * @returns Elemento JSX contendo o player de vídeo.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri }) => {
    // Inicializa o player com a fonte (URI) e configurações iniciais.
    // A função de configuração recebe a instância do player (p), permitindo ajustar opções antes da reprodução.
    const player = useVideoPlayer(uri, (p) => {
        p.loop = true; // Reproduz o vídeo em loop (reinicia ao chegar ao fim)
        p.muted = false; // Mantém o áudio habilitado por padrão
    });

    return (
        <View style={styles.container}>
            {/*
              VideoView é o componente visual do player.
              - player: instância do player criada pelo hook `useVideoPlayer`.
              - style: dimensões e estética do container do vídeo.
              - contentFit: estratégia de ajuste do conteúdo dentro do container.
              - nativeControls: exibe os controles de mídia padrão do sistema.
            */}
            <VideoView
                player={player} // Conecta a instância do player ao componente visual
                style={styles.video} // Aplica dimensões (150x150) e bordas arredondadas
                contentFit="contain" // Mantém a proporção do vídeo sem cortar
                nativeControls // Mostra controles nativos (play/pause, timeline, etc.)
            />
        </View>
    );
};

/**
 * Estilos utilizados pelo componente `VideoPlayer`.
 * - `container`: centraliza o player na área disponível.
 * - `video`: define dimensões padrão e bordas arredondadas.
 */
const styles = StyleSheet.create({
    container: {
        justifyContent: 'center', // Alinha verticalmente o conteúdo ao centro
        alignItems: 'center', // Alinha horizontalmente o conteúdo ao centro
    },
    video: {
        width: 150, // Largura padrão do player (px)
        height: 150, // Altura padrão do player (px)
        borderRadius: 8, // Cantos levemente arredondados para melhor estética
    },
});

export default VideoPlayer;

