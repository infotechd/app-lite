import React, { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';
import { Divider, List, Menu, Snackbar } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/context/AuthContext';
import { showDestructiveConfirm } from '@/utils/alert';

export interface ProfileMoreMenuProps {
  visible: boolean;
  onDismiss: () => void;
  profileId: string;
  profileUrl: string;
  // Opcional: âncora para o Menu do Paper
  anchor: React.ReactNode;
  onNavigateSettings?: () => void; // opcional
}

const ProfileMoreMenu: React.FC<ProfileMoreMenuProps> = ({
  visible,
  onDismiss,
  profileId,
  profileUrl,
  anchor,
  onNavigateSettings,
}) => {
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const { isAuthenticated, logout } = useAuth();

  const showToast = useCallback((message: string) => {
    setSnackbar({ visible: true, message });
  }, []);

  const onShare = useCallback(async () => {
    try {
      // Para iOS, é útil enviar também a `url`
      await Share.share(
        Platform.select({
          ios: { message: profileUrl, url: profileUrl },
          default: { message: profileUrl },
        }) as any,
      );
    } catch (e) {
      console.log('Erro ao compartilhar perfil:', e);
    } finally {
      onDismiss();
    }
  }, [onDismiss, profileUrl]);

  const onCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(profileUrl);
      showToast('Link do perfil copiado');
    } catch (e) {
      console.log('Falha ao copiar para a área de transferência:', e);
      showToast('Não foi possível copiar o link');
    } finally {
      onDismiss();
    }
  }, [onDismiss, profileUrl, showToast]);

  const onReport = useCallback(async () => {
    onDismiss();
    const confirmed = await showDestructiveConfirm(
      'Denunciar perfil',
      'Tem certeza que deseja denunciar este perfil por comportamento inadequado?',
      'Denunciar',
      'Cancelar'
    );
    
    if (confirmed) {
      console.log('Denunciar perfil:', { profileId });
      showToast('Denúncia registrada');
    }
  }, [onDismiss, profileId, showToast]);

  const onBlock = useCallback(async () => {
    onDismiss();
    const confirmed = await showDestructiveConfirm(
      'Bloquear usuário',
      'Você não verá mais este perfil e ele não poderá interagir com você. Deseja continuar?',
      'Bloquear',
      'Cancelar'
    );
    
    if (confirmed) {
      console.log('Bloquear usuário:', { profileId });
      showToast('Usuário bloqueado');
    }
  }, [onDismiss, profileId, showToast]);

  const onSettings = useCallback(() => {
    onDismiss();
    if (onNavigateSettings) {
      onNavigateSettings();
    } else {
      console.log('Abrir configurações de privacidade (placeholder) para:', { profileId });
    }
  }, [onDismiss, onNavigateSettings, profileId]);

  return (
    <>
      <Menu visible={visible} onDismiss={onDismiss} anchor={anchor}>
        <List.Item
          title="Compartilhar perfil"
          left={(props) => <List.Icon {...props} icon="share-variant" />}
          onPress={onShare}
        />
        <List.Item
          title="Copiar link do perfil"
          left={(props) => <List.Icon {...props} icon="link-variant" />}
          onPress={onCopyLink}
        />
        <Divider />
        <List.Item
          title="Denunciar"
          left={(props) => <List.Icon {...props} icon="alert-octagon-outline" color={props.color} />}
          onPress={onReport}
        />
        <List.Item
          title="Bloquear"
          left={(props) => <List.Icon {...props} icon="block-helper" color={props.color} />}
          onPress={onBlock}
        />
        {/* Opcional */}
        <List.Item
          title="Configurações"
          left={(props) => <List.Icon {...props} icon="cog-outline" />}
          onPress={onSettings}
        />

        {isAuthenticated && (
          <>
            <Divider />
            <List.Item
              title="Sair"
              left={(props) => <List.Icon {...props} icon="logout-variant" />}
              onPress={async () => {
                onDismiss();
                try {
                  await logout();
                } catch (e) {
                  // noop
                }
              }}
            />
          </>
        )}
      </Menu>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
};

export default ProfileMoreMenu;
