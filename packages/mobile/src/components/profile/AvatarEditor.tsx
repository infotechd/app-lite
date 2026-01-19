import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, IconButton, Menu, Divider, ActivityIndicator } from 'react-native-paper';
import { useProfileAvatar } from '@/hooks/useProfileAvatar';
import { colors } from '@/styles/theme';
import OptimizedImage from '@/components/common/OptimizedImage';
import { useAuth } from '@/context/AuthContext';

/**
 * Componente para edição visual do avatar do usuário.
 * Permite visualizar, alterar e remover a foto de perfil através de uma interface interativa.
 * 
 * @returns {JSX.Element} O componente de edição de avatar renderizado.
 */
const AvatarEditor: React.FC = () => {
  // Hook para obter os dados do usuário autenticado (incluindo URL do avatar e blurhash)
  const { user } = useAuth();
  
  // Hook personalizado que encapsula a lógica de manipulação do avatar (galeria, câmera, remoção)
  const { pickFromGallery, takePhoto, remove, isLoading, hasAvatar } = useProfileAvatar();
  
  // Estado local para controlar a visibilidade do menu de opções (aberto/fechado)
  const [menuVisible, setMenuVisible] = useState(false);

  // Estado para rastrear se houve erro ao carregar a imagem do avatar
  const [imageError, setImageError] = useState(false);

  /**
   * Abre o menu suspenso de opções do avatar.
   * @returns {void}
   */
  const openMenu = () => setMenuVisible(true);
  
  /**
   * Fecha o menu suspenso de opções do avatar.
   * @returns {void}
   */
  const closeMenu = () => setMenuVisible(false);

  // Define a inicial do nome do usuário para exibição quando não houver imagem de avatar
  // Utiliza o primeiro caractere do nome ou 'U' como padrão, sempre em maiúsculo
  const initial = (user?.nome?.[0] ?? 'U').toUpperCase();
  
  // URL da imagem de avatar do usuário extraída do objeto user
  const avatarUrl = user?.avatar;

  // Reseta o estado de erro quando a URL do avatar muda
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={openMenu} activeOpacity={0.7}>
              {/* Exibição condicional: mostra a imagem otimizada se houver URL válida, ou as iniciais do usuário como fallback */}
              {avatarUrl && !imageError ? (
                <OptimizedImage
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  blurhash={user?.avatarBlurhash}
                  onError={() => setImageError(true)}
                />
              ) : (
                <Avatar.Text label={initial} size={120} style={styles.avatar} />
              )}
              
              {/* Overlay visual de carregamento exibido enquanto uma operação de upload/deleção está em curso */}
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator animating={true} color={colors.primary} size="large" />
                </View>
              )}

              {/* Badge visual (ícone de câmera) posicionado sobre o avatar para indicar interatividade */}
              <View style={styles.editBadge}>
                <IconButton
                  icon="camera"
                  size={20}
                  iconColor="white"
                  containerColor={colors.primary}
                />
              </View>
            </TouchableOpacity>
          }
          contentStyle={styles.menuContent}
        >
          {/* Item de menu para disparar a captura de foto via câmera do dispositivo */}
          <Menu.Item
            onPress={async () => {
              closeMenu();
              await takePhoto();
            }}
            leadingIcon="camera"
            title="Tirar foto"
          />
          {/* Item de menu para permitir a escolha de uma imagem da galeria local */}
          <Menu.Item
            onPress={async () => {
              closeMenu();
              await pickFromGallery();
            }}
            leadingIcon="image-multiple"
            title="Escolher da galeria"
          />
          {/* Seção de remoção de foto, visível apenas quando o usuário possui um avatar configurado */}
          {hasAvatar && (
            <>
              <Divider />
              <Menu.Item
                onPress={async () => {
                  closeMenu();
                  await remove();
                }}
                leadingIcon="delete"
                title="Remover foto"
                titleStyle={{ color: colors.error }}
              />
            </>
          )}
        </Menu>
      </View>
    </View>
  );
};

/**
 * Definições de estilo para o componente AvatarEditor utilizando StyleSheet do React Native.
 * Garante otimização de renderização e separação de preocupações visuais.
 */
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24, // Espaçamento vertical externo para o bloco do avatar
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60, // Borda arredondada para criar o efeito circular (50% do tamanho)
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 4, // Sombra para dispositivos Android
    shadowColor: '#000', // Início da configuração de sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Faz o overlay ocupar 100% do pai
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Fundo branco com opacidade
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Garante que o spinner fique acima da imagem
  },
  menuContent: {
    marginTop: 40, // Margem para posicionar o menu adequadamente abaixo do avatar
  }
});

export default AvatarEditor;
