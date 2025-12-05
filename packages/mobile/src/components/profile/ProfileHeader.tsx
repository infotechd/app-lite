import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Button, IconButton } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';
import { THEME_CONFIG } from '@/constants/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Kpi from './Kpi';
import AnalyticsService from '@/services/AnalyticsService';
import ProfileMoreMenu from './ProfileMoreMenu';

import OptimizedImage from '@/components/common/OptimizedImage';

interface ProfileHeaderProps {
  user: any | null;
  profileId: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, profileId }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const profileUrl = useMemo(() => `https://seuapp.com/profile/${profileId}`, [profileId]);
  const initial = (user?.nome?.[0] ?? 'U').toUpperCase();
  const displayName = user?.nome ?? 'Usuário';
  const handle = `@${user?.nome ? user.nome.toLowerCase().replace(/\s/g, '') : 'usuario'}`;
  const avatarUrl = user?.avatar;
  // Mock blurhash - idealmente viria do backend
  const avatarBlurhash = user?.avatarBlurhash ?? 'L6PZfSi_.AyE_3t7t7R**j_3mWj?';

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <OptimizedImage
            source={{ uri: avatarUrl }}
            blurhash={avatarBlurhash}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Text label={initial} size={80} style={styles.avatar} />
        )}
        {user?.verified ? (
          <VerifiedBadge />
        ) : null}
      </View>
      <View style={styles.texts}>
        <Text variant="titleLarge" style={styles.textCenter}>{displayName}</Text>
        <Text variant="bodyMedium" style={[styles.textCenter, { color: colors.textSecondary }]}>
          {handle}
        </Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.textCenter]}>
          Breve descrição sobre você. Toque para editar.
        </Text>
      </View>
      <View style={styles.metrics}>
        <Kpi label="Avaliações" value="4.8" />
        <Kpi label="Seguidores" value="1.2k" />
        <Kpi label="Pedidos" value="320" />
      </View>
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={() => {
            AnalyticsService.track('profile_edit_click');
          }}
        >
          Editar Perfil
        </Button>
        <ProfileMoreMenu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          profileId={profileId}
          profileUrl={profileUrl}
          anchor={
            <IconButton
              icon="dots-horizontal"
              onPress={() => {
                setMenuVisible(true);
                AnalyticsService.track('profile_more_options_click');
              }}
              style={{ marginLeft: spacing.sm }}
            />
          }
          onNavigatePrivacySettings={() => {
            // Navegação opcional
            // navigation.navigate('PrivacySettings', { profileId });
            console.log('Ir para tela de Configurações de Privacidade');
          }}
        />
      </View>
    </View>
  );
};

const VerifiedBadge: React.FC = () => (
    <View
        style={styles.verifiedBadge}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Perfil verificado"
    >
        <MaterialCommunityIcons
            name="check-decagram"
            size={16}
            color={colors.surface}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        />
    </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.surface,
    ...THEME_CONFIG.shadows.md,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    padding: spacing.xs,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  texts: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  metrics: {
    marginTop: spacing.md,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 2, // pequeno respiro para evitar corte do label dos KPIs
  },
  actionsContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProfileHeader;
