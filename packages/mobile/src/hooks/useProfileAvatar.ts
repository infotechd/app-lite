import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar as uploadAvatarService, removeAvatar as removeAvatarService } from '@/services/profileService';
import { useMediaPicker } from './useMediaPicker';
import { User } from '@/types';

/**
 * Hook customizado para gerenciar o avatar (foto de perfil) do usuário.
 * Versão 2.0: Centraliza a lógica de upload e remoção, integrando com o AuthContext.
 * 
 * @returns {Object} Métodos e estados para manipulação do avatar.
 */
export const useProfileAvatar = () => {
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Atualiza o estado global do usuário com os dados retornados do backend.
   */
  const handleSuccess = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, [setUser]);

  /**
   * Configuração do seletor de mídia.
   * Ao selecionar uma imagem, o upload é iniciado imediatamente.
   */
  const { pickFromGallery, takePhoto } = useMediaPicker({
    onSelect: async (media) => {
      if (media && media.length > 0) {
        setIsLoading(true);
        try {
          const updatedUser = await uploadAvatarService(media[0]);
          handleSuccess(updatedUser);
        } catch (error: any) {
          Alert.alert('Erro ao carregar foto', error?.message || 'Tente novamente.');
        } finally {
          setIsLoading(false);
        }
      }
    },
    mediaType: 'images',
    maxFiles: 1,
  });

  /**
   * Remove a foto de perfil do usuário.
   */
  const remove = useCallback(async () => {
    if (!user?.avatar) return;

    Alert.alert(
      'Remover foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const updatedUser = await removeAvatarService();
              handleSuccess(updatedUser);
            } catch (error: any) {
              Alert.alert('Erro ao remover foto', error?.message || 'Tente novamente.');
            } finally {
              setIsLoading(false);
            }
          }
        },
      ]
    );
  }, [user?.avatar, handleSuccess]);

  return { 
    pickFromGallery, 
    takePhoto, 
    remove, 
    isLoading,
    hasAvatar: !!user?.avatar 
  };
};

export default useProfileAvatar;
