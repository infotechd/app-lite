import { useState, useCallback } from 'react';
import { showAlert, showDestructiveConfirm } from '@/utils/alert';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar as uploadAvatarService, removeAvatar as removeAvatarService } from '@/services/profileService';
import { useMediaPicker } from './useMediaPicker';
import { User } from '@/types';

/**
 * Interface de retorno do hook useProfileAvatar.
 */
export interface UseProfileAvatarReturn {
  pickFromGallery: () => Promise<void>;
  takePhoto: () => Promise<void>;
  remove: () => Promise<void>;
  isLoading: boolean;
  hasAvatar: boolean;
}

/**
 * Hook customizado para gerenciar o avatar (foto de perfil) do usuário.
 * Versão 2.0: Centraliza a lógica de upload e remoção, integrando com o AuthContext.
 */
export const useProfileAvatar = (): UseProfileAvatarReturn => {
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Atualiza o estado global do usuário com os dados retornados do backend.
   */
  const handleSuccess = useCallback(async (updatedUser: User) => {
    await setUser(updatedUser);
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
          await handleSuccess(updatedUser);
        } catch (error: any) {
          showAlert('Erro ao carregar foto', error?.message || 'Tente novamente.');
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

    const confirmed = await showDestructiveConfirm(
      'Remover foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      'Remover',
      'Cancelar'
    );
    
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await removeAvatarService();
      await handleSuccess(updatedUser);
    } catch (error: any) {
      showAlert('Erro ao remover foto', error?.message || 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
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
