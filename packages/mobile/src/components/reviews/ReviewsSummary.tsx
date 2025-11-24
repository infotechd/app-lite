import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ReviewsSummaryData } from '@/types/reviews';
import { colors, spacing, typography, radius } from '@/styles/theme';

type Props = {
  summary: ReviewsSummaryData;
};

const StarRow = ({ rating }: { rating: number }) => {
  const rounded = Math.round(rating);
  return (
    <Text
      accessibilityRole="image"
      accessibilityLabel={`${rating.toFixed(1)} de 5 estrelas`}
      style={styles.stars}
    >
      {[1, 2, 3, 4, 5]
        .map((i) => (i <= rounded ? '★' : '☆'))
        .join(' ')}
    </Text>
  );
};

export const ReviewsSummary: React.FC<Props> = ({ summary }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.average}>{summary.average.toFixed(1)}</Text>
        <StarRow rating={summary.average} />
      </View>
      <Text style={styles.total}>baseado em {summary.total} avaliações</Text>

      {([5, 4, 3, 2, 1] as const).map((stars) => {
        const pct = summary.distributionPct[stars] || 0;
        return (
          <View key={stars} style={styles.barRow}>
            <Text style={styles.barLabel}>{stars}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.barPct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  average: { fontSize: 32, fontWeight: '700', marginRight: spacing.sm, color: colors.text },
  stars: { color: colors.warning, fontSize: 16 },
  total: { color: colors.textSecondary, marginBottom: spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  barLabel: { width: 20, color: colors.textSecondary },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: colors.warning },
  barPct: { width: 40, textAlign: 'right', color: colors.textSecondary, ...typography.caption },
});

export default ReviewsSummary;
