import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/styles/theme';
import { SkeletonBox, SkeletonGroup } from './SkeletonPrimitives';

interface Props {
  testID?: string;
}

const ProfileHeaderSkeleton: React.FC<Props> = ({ testID }) => {
  const avatarSize = 80;

  return (
    <SkeletonGroup>
      <View testID={testID} style={styles.container}>
        {/* Avatar + selo simulado */}
        <View style={styles.avatarContainer}>
          <SkeletonBox width={avatarSize} height={avatarSize} radius={avatarSize / 2} />
          {/* Badge circular */}
          <View style={styles.verifiedBadge}>
            <SkeletonBox width={20} height={20} radius={radius.round} />
          </View>
        </View>

        {/* Linhas de texto: nome, handle, bio */}
        <View style={styles.texts}>
          <SkeletonBox width={'60%'} height={18} />
          <View style={{ height: spacing.xs }} />
          <SkeletonBox width={'40%'} height={14} />
          <View style={{ height: spacing.sm }} />
          <SkeletonBox width={'90%'} height={12} />
          <View style={{ height: spacing.xs }} />
          <SkeletonBox width={'70%'} height={12} />
        </View>

        {/* KPIs: 3 retângulos */}
        <View style={styles.metrics}>
          {[0, 1, 2].map((i) => (
            <SkeletonBox key={i} width={100} height={56} radius={radius.md} />
          ))}
        </View>

        {/* Ações: botão Editar + botão mais */}
        <View style={styles.actionsContainer}>
          <SkeletonBox width={160} height={40} radius={radius.round} />
          <View style={{ width: spacing.sm }} />
          <SkeletonBox width={40} height={40} radius={20} />
        </View>
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  avatarContainer: {
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  texts: {
    marginTop: spacing.md,
    alignItems: 'center',
    width: '100%',
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

export default ProfileHeaderSkeleton;
