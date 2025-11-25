import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox, SkeletonGroup } from '@/components/profile/skeletons/SkeletonPrimitives';
import { radius, spacing } from '@/styles/theme';

/**
 * ReviewsTabSkeleton
 * Estrutura que imita a ReviewsTab: Summary, filtros e cards de review.
 */
const ReviewsTabSkeleton: React.FC = () => {
  return (
    <SkeletonGroup>
      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <SkeletonBox width={80} height={32} />
          <View style={{ width: spacing.sm }} />
          <SkeletonBox width={120} height={16} />
        </View>
        <SkeletonBox width={'60%'} height={12} />

        {/* Filters */}
        <View style={[styles.row, { marginTop: spacing.md }]}>
          <SkeletonBox width={90} height={32} radius={radius.xl} />
          <View style={{ width: spacing.xs }} />
          <SkeletonBox width={120} height={32} radius={radius.xl} />
          <View style={{ width: spacing.xs }} />
          <SkeletonBox width={80} height={32} radius={radius.xl} />
        </View>
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <SkeletonBox width={110} height={32} radius={radius.xl} />
          <View style={{ width: spacing.xs }} />
          <SkeletonBox width={140} height={32} radius={radius.xl} />
        </View>

        {/* Cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={`sk-review-${i}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <SkeletonBox width={40} height={40} radius={20} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <SkeletonBox width={160} height={14} />
                <View style={{ height: spacing.xs }} />
                <SkeletonBox width={100} height={12} />
              </View>
              <SkeletonBox width={80} height={16} />
            </View>
            <SkeletonBox width={'90%'} height={12} />
            <View style={{ height: spacing.xs }} />
            <SkeletonBox width={'70%'} height={12} />
            <View style={styles.photosRow}>
              <SkeletonBox width={100} height={100} radius={radius.md} />
              <View style={{ width: spacing.xs }} />
              <SkeletonBox width={100} height={100} radius={radius.md} />
              <View style={{ width: spacing.xs }} />
              <SkeletonBox width={100} height={100} radius={radius.md} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { paddingVertical: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  photosRow: { flexDirection: 'row', marginTop: spacing.xs },
});

export default ReviewsTabSkeleton;
