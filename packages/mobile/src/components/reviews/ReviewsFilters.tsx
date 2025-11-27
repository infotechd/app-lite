import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ReviewFilter, ReviewSort } from '@/types/reviews';
import { colors, spacing, radius } from '@/styles/theme';
import AnalyticsService from '@/services/AnalyticsService';

type Props = {
  filter: ReviewFilter;
  sort: ReviewSort;
  onChangeFilter: (f: ReviewFilter) => void;
  onChangeSort: (s: ReviewSort) => void;
};

const Chip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
  </Pressable>
);

export const ReviewsFilters: React.FC<Props> = ({ filter, sort, onChangeFilter, onChangeSort }) => {
  const trackFilterChange = (type: 'filter' | 'sort', value: string) => {
    const filter_type = type;
    const filter_value = value.replace(/\s+/g, '_').toLowerCase();
    AnalyticsService.track('profile_review_filter_change', { filter_type, filter_value });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Chip label="Todas" active={filter === 'all'} onPress={() => { onChangeFilter('all'); trackFilterChange('filter', 'all'); }} />
        <Chip label="Comentários" active={filter === 'comments'} onPress={() => { onChangeFilter('comments'); trackFilterChange('filter', 'comments'); }} />
        <Chip label="Fotos" active={filter === 'photos'} onPress={() => { onChangeFilter('photos'); trackFilterChange('filter', 'photos'); }} />
      </View>
      <View style={styles.row}>
        <Text style={styles.sortLabel}>Ordenar:</Text>
        <Chip label="Mais recentes" active={sort === 'recent'} onPress={() => { onChangeSort('recent'); trackFilterChange('sort', 'recent'); }} />
        <Chip label="Mais relevantes" active={sort === 'relevant'} onPress={() => { onChangeSort('relevant'); trackFilterChange('sort', 'relevant'); }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  sortLabel: { color: colors.text, marginRight: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    marginRight: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipLabel: { color: colors.text },
  chipLabelActive: { color: '#FFFFFF' },
});

export default ReviewsFilters;
