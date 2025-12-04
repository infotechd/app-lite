import React from 'react';
import OptimizedImage from '@/components/common/OptimizedImage';
import { View, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '@/styles/theme';
import type { Activity } from '@/hooks/useUserActivity';

type Props = {
  activity: Activity;
};

const currencyBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDate(dateISO: string) {
  try {
    return new Date(dateISO).toLocaleString('pt-BR');
  } catch {
    return dateISO;
  }
}

const EmojiIcon = ({ type }: { type: Activity['type'] }) => {
  const iconMap: Record<Activity['type'], string> = {
    new_post: '🖼️',
    sale_completed: '🛒',
    rating_received: '⭐',
  } as const;
  return <Text style={styles.icon}>{iconMap[type] || '🔔'}</Text>;
};

const ActivityCardComponent: React.FC<Props> = ({ activity }) => {
  return (
    <View style={styles.card} accessible accessibilityRole="summary">
      <View style={styles.header}>
        <EmojiIcon type={activity.type} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {activity.type === 'sale_completed' ? `Venda: ${activity.productName}` : activity.title}
          </Text>
          <Text style={styles.subtitle}>{formatDate(activity.date)}</Text>
        </View>
      </View>

      {activity.type === 'new_post' && !!activity.thumbnailUrl && (
        <OptimizedImage
          source={{ uri: activity.thumbnailUrl }}
          blurhash={activity.thumbnailBlurhash}
          style={styles.cover}
        />
      )}

      {activity.type === 'sale_completed' && (
        <View style={styles.content}>
          <Text style={styles.detailText}>Valor: {currencyBRL.format(activity.amount)}</Text>
        </View>
      )}

      {activity.type === 'rating_received' && (
        <View style={[styles.content, styles.row]}>
          <Text style={styles.rating}>{'★'.repeat(activity.rating)}</Text>
          <Text style={styles.detailText}>{activity.rating} de 5</Text>
        </View>
      )}
    </View>
  );
};

function areEqual(prev: Props, next: Props) {
  const a = prev.activity;
  const b = next.activity;
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.title === b.title &&
    a.date === b.date &&
    // Campos específicos por tipo
    (a.type !== 'new_post' || b.type !== 'new_post' || a.thumbnailUrl === (b as any).thumbnailUrl) &&
    (a.type !== 'sale_completed' || b.type !== 'sale_completed' ||
      (a.productName === (b as any).productName && (a.amount as any) === (b as any).amount)) &&
    (a.type !== 'rating_received' || b.type !== 'rating_received' || a.rating === (b as any).rating)
  );
}

const ActivityCard = React.memo(ActivityCardComponent, areEqual);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cover: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: colors.warning,
    marginRight: spacing.xs,
    fontSize: 18,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default ActivityCard;
