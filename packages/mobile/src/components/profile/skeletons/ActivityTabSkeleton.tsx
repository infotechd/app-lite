import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/styles/theme';
import { SkeletonBox, SkeletonGroup } from './SkeletonPrimitives';

interface Props {
  items?: number;
}

const ActivityTabSkeleton: React.FC<Props> = ({ items = 4 }) => {
  return (
    <SkeletonGroup>
      <View style={styles.container}>
        {Array.from({ length: items }).map((_, idx) => (
          <View key={idx} style={styles.card}>
            <SkeletonBox width={'100%'} height={160} radius={radius.md} />
            <View style={{ height: spacing.md }} />
            <SkeletonBox width={'80%'} height={14} />
            <View style={{ height: spacing.xs }} />
            <SkeletonBox width={'60%'} height={14} />
            <View style={{ height: spacing.xs }} />
            <SkeletonBox width={'40%'} height={14} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
});

export default ActivityTabSkeleton;
