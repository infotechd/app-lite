import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';

/**
 * Componente de tela para adição ou alteração da foto de perfil.
 * 
 * Este componente permite que o usuário selecione uma imagem da galeria do dispositivo
 * ou capture uma nova foto utilizando a câmera. Ele exibe uma pré-visualização da imagem
 * selecionada e permite realizar o upload para o servidor.
 * 
 * @component
 * @returns {JSX.Element} Elemento React representando a tela de adição de foto.
 */
const ProfileAddPhoto: React.FC = () => {
  /**
   * Hook customizado que gerencia a lógica de manipulação de fotos de perfil.
   * 
   * Retorna funções para seleção via galeria, captura via câmera e upload,
   * além do estado de pré-visualização e status de carregamento.
   */
  const { pickFromGallery, takePhoto, upload, preview, uploading } = useProfilePhoto();
  
  /**
   * Extrai o URI da imagem de visualização prévia, se houver um arquivo selecionado.
   * O cast para 'any' é utilizado para acessar a propriedade 'uri' do objeto de preview.
   */
  const previewUri = (preview as any)?.uri;

  return (
    <View style={styles.container}>
      {/* Título e instruções da tela */}
      <Text variant="titleLarge" style={styles.title}>Adicionar foto de perfil</Text>
      <Text style={styles.subtitle}>Escolha uma imagem da galeria ou tire uma foto.</Text>

      {/* 
        Container de visualização da imagem. 
        Exibe a imagem selecionada ou um texto informativo caso nenhuma tenha sido escolhida.
      */}
      <View style={styles.previewBox}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <Text style={styles.placeholder}>Nenhuma imagem selecionada</Text>
        )}
      </View>

      {/* Botões para acionar os métodos de seleção de imagem (Galeria ou Câmera) */}
      <View style={styles.actions}>
        <Button mode="outlined" onPress={pickFromGallery} style={{ flex: 1 }}>
          Galeria
        </Button>
        <Button mode="outlined" onPress={takePhoto} style={{ flex: 1 }}>
          Câmera
        </Button>
      </View>

      {/* 
        Botão de confirmação de upload.
        É desabilitado se não houver imagem selecionada ou se o upload já estiver em processamento.
      */}
      <Button
        mode="contained"
        onPress={upload}
        disabled={!previewUri || uploading}
        loading={uploading}
        style={styles.uploadBtn}
      >
        Salvar foto
      </Button>

      {/* Texto de suporte com restrições técnicas para o upload */}
      <Text style={styles.helper}>Formatos aceitos: JPEG/PNG até 5MB.</Text>
    </View>
  );
};

/**
 * Definições de estilos para os componentes da tela.
 * Utiliza o sistema de cores e espaçamento centralizado do tema.
 */
const styles = StyleSheet.create({
  /** Container principal da tela com preenchimento e espaçamento vertical entre elementos */
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  /** Estilo centralizado para o título */
  title: {
    textAlign: 'center',
  },
  /** Estilo para o subtítulo com cor secundária */
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  /** Área que contém a visualização da foto, com bordas arredondadas e centralização */
  previewBox: {
    height: 240,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** Estilo para a imagem de pré-visualização, cobrindo todo o container */
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  /** Estilo para o texto exibido quando não há imagem selecionada */
  placeholder: {
    color: colors.textSecondary,
  },
  /** Container para os botões de ação (Galeria/Câmera) dispostos em linha */
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  /** Espaçamento superior para o botão de upload */
  uploadBtn: {
    marginTop: spacing.md,
  },
  /** Estilo para o texto de ajuda/rodapé */
  helper: {
    textAlign: 'center',
    color: colors.textSecondary,
  }
});

export default ProfileAddPhoto;
