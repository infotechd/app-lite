import React from 'react';
import { View, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import { MediaFile } from '@/types/media';
import VideoPlayer from '@/components/common/VideoPlayer';

/**
 * Propriedades aceitas pelo componente `MediaPreview`.
 * Representam os arquivos de mídia selecionados e a ação de remoção.
 */
interface MediaPreviewProps {
  /** Lista de arquivos de mídia (imagem/vídeo) a serem exibidos na pré-visualização. */
  mediaFiles: MediaFile[];
  /**
   * Função chamada ao pressionar o botão de remover em um item específico.
   * Recebe o índice do item na lista como argumento.
   */
  onRemove: (index: number) => void;
  /**
   * Função opcional chamada ao pressionar um item de mídia.
   * Recebe a URI do item como argumento.
   */
  onPreview?: (uri: string) => void;
}

/**
 * Componente de pré-visualização de mídias.
 *
 * Exibe uma lista horizontal de itens (imagens e/ou vídeos) permitindo que o usuário
 * visualize o conteúdo antes de enviar e remova itens individualmente.
 *
 * @param mediaFiles Lista de arquivos de mídia (imagens e vídeos) a serem exibidos.
 * @param onRemove Callback disparado ao tocar no botão de remover; recebe o índice do item.
 * @param onPreview Callback opcional disparado ao tocar em um item de mídia.
 * @returns Elemento React contendo a lista horizontal de pré-visualizações.
 */
const MediaPreview: React.FC<MediaPreviewProps> = ({ mediaFiles, onRemove, onPreview }) => {
  /**
   * Renderiza um item de mídia dentro de um cartão, alternando entre vídeo e imagem
   * conforme o tipo do arquivo. Também aplica o botão de remoção sobreposto.
   *
   * @param item Arquivo de mídia atual (contém uri e type).
   * @param index Posição do item dentro do array `mediaFiles`.
   * @returns Elemento React com a pré-visualização e botão de remover.
   */
  const renderItem = ({ item, index }: { item: MediaFile; index: number }) => (
    <Card style={styles.mediaItem}>
      <Card.Content>
        <TouchableOpacity onPress={() => onPreview?.(item.uri)} disabled={!onPreview}>
            {item.type === 'video' ? (
              // Pré-visualização de vídeo usando o componente reutilizável
              <VideoPlayer uri={item.uri} />
            ) : (
              // Pré-visualização de imagem nativa
              <Image source={{ uri: item.uri }} style={styles.image} />
            )}
        </TouchableOpacity>
        <IconButton
          icon="close-circle"
          size={24}
          // Remove o item correspondente pelo índice
          onPress={() => onRemove(index)}
          style={styles.removeButton}
        />
      </Card.Content>
    </Card>
  );

  const isTestEnv = (globalThis as any)?.__TEST__;

  if (isTestEnv) {
    // Em ambiente de teste, renderizamos de forma simples para evitar virtualização do FlatList
    return (
      <View style={styles.container}>
        <View style={styles.listContainer}>
          {mediaFiles.map((item, index) => (
            <View key={`${item.uri}-${index}`}>{renderItem({ item, index } as any)}</View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={mediaFiles}
        renderItem={renderItem}
        // Chave composta para minimizar colisões quando o mesmo URI é reutilizado
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Espaçamento/estilo aplicado ao container interno da lista
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Margens verticais para separar a seção do restante do layout
    marginVertical: spacing.md,
    // Recuo horizontal para que os cartões não encostem nas bordas
    paddingHorizontal: spacing.sm,
  },
  // Mantido vazio para permitir customizações futuras do container da FlatList
  listContainer: {},
  mediaItem: {
    // Espaçamento entre itens da lista horizontal
    marginRight: spacing.md,
    // Necessário para posicionar o botão de remover de forma absoluta
    position: 'relative',
  },
  image: {
    // Tamanho fixo para miniaturas de imagem
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  removeButton: {
    // Botão sobreposto no canto superior direito do cartão
    position: 'absolute',
    top: -10,
    right: -10,
    // Fundo semitransparente para melhor contraste sobre a mídia
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
});

export default MediaPreview;

