import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Button, IconButton } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';
import { THEME_CONFIG } from '@/constants/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Kpi from './Kpi';

interface ProfileHeaderProps {
  user: any | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const initial = (user?.nome?.[0] ?? 'U').toUpperCase();
  const displayName = user?.nome ?? 'Usuário';
  const handle = `@${user?.nome ? user.nome.toLowerCase().replace(/\s/g, '') : 'usuario'}`;

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Avatar.Text label={initial} size={80} style={styles.avatar} />
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
        <Button mode="contained" onPress={() => console.log('Editar Perfil')}>
          Editar Perfil
        </Button>
        <IconButton
          icon="dots-horizontal"
          onPress={() => console.log('Mais Opções')}
          style={{ marginLeft: spacing.sm }}
        />
      </View>
    </View>
  );
};

const VerifiedBadge: React.FC = () => (
  <View style={styles.verifiedBadge}>
    <MaterialCommunityIcons name="check-decagram" size={16} color={colors.surface} />
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
  },
  actionsContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProfileHeader;
