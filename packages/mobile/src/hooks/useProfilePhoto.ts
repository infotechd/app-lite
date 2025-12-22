import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar } from '@/services/profileService';
import { useMediaPicker } from './useMediaPicker';

/**
 * Hook customizado para gerenciar a seleção e o upload da foto de perfil do usuário.
 * 
 * Este hook encapsula a integração com o seletor de mídia, o gerenciamento do estado 
 * de pré-visualização, a execução do upload para o servidor e a atualização 
 * sincronizada do perfil do usuário no contexto global e no armazenamento local.
 * 
 * @returns {Object} Objeto contendo os métodos e estados para manipulação da foto.
 * @property {Function} pickFromGallery - Aciona a abertura da galeria de imagens do dispositivo.
 * @property {Function} takePhoto - Aciona a câmera para captura de uma nova foto.
 * @property {Function} upload - Executa o envio da imagem selecionada para o servidor.
 * @property {any|null} preview - Objeto contendo os dados da imagem selecionada para visualização prévia.
 * @property {boolean} uploading - Indica se o processo de upload está em execução no momento.
 */
export const useProfilePhoto = () => {
  /** Hook para acessar e manipular os dados de autenticação e perfil do usuário logado */
  const { user, setUser } = useAuth();
  
  /** Hook de navegação para controle de histórico de telas */
  const navigation = useNavigation();
  
  /** Estado que controla a exibição de indicadores de carregamento durante o upload */
  const [uploading, setUploading] = useState(false);
  
  /** Armazena as informações do arquivo de imagem selecionado (URI, nome, tipo, etc.) */
  const [preview, setPreview] = useState<any | null>(null);

  /**
   * Instância do seletor de mídia configurada para imagens.
   * Quando uma mídia é selecionada, o primeiro item (único neste caso) é definido como preview.
   */
  const { pickFromGallery, takePhoto } = useMediaPicker({
    onSelect: (media) => {
      const first = media?.[0];
      if (first?.uri) {
        setPreview(first);
      }
    },
    mediaType: 'images',
    maxFiles: 1,
  });

  /**
   * Função assíncrona responsável por realizar o upload da foto para o backend.
   * 
   * Valida a existência de uma imagem, envia para o serviço de upload, 
   * atualiza os dados do usuário localmente se necessário e redireciona o usuário.
   * 
   * @async
   * @function upload
   * @returns {Promise<any|null>} Retorna os dados da resposta do servidor ou null em caso de falha.
   */
  const upload = useCallback(async () => {
    // Verifica se o usuário selecionou uma foto antes de tentar o upload
    if (!preview) {
      Alert.alert('Selecione uma foto primeiro');
      return null;
    }

    try {
      setUploading(true);
      
      // Chamada ao serviço de API que lida com o Multipart Form Data para upload
      const result = await uploadAvatar(preview);
      
      // Sincronização dos dados do usuário após alteração do avatar
      if (user) {
        // Cria um novo objeto de usuário preservando os dados atuais e atualizando apenas o avatar
        const nextUser = { ...user, avatar: result.avatar } as any;
        setUser(nextUser);
        
        // Persistência local para manter a sessão atualizada após recarregamentos do app
        await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      }
      
      // Retorna o usuário para a tela anterior indicando sucesso
      navigation.goBack();
      return result;
    } catch (err: any) {
      // Tratamento de erro centralizado com feedback visual via alerta
      Alert.alert('Erro ao enviar foto', err?.message || 'Tente novamente');
      return null;
    } finally {
      // Garante que o estado de carregamento seja desativado ao final do processo
      setUploading(false);
    }
  }, [preview, user, setUser, navigation]);

  return {
    pickFromGallery,
    takePhoto,
    upload,
    preview,
    uploading,
  };
};

export default useProfilePhoto;
