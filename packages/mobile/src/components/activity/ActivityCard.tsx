import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import { colors, radius, spacing } from '@/styles/theme';
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

const LeftIcon = (type: Activity['type']) => (props: any) => {
  switch (type) {
    case 'new_post':
      return <Avatar.Icon {...props} icon="image" />;
    case 'sale_completed':
      return <Avatar.Icon {...props} icon="cart" />;
    case 'rating_received':
      return <Avatar.Icon {...props} icon="star" />;
    default:
      return <Avatar.Icon {...props} icon="bell" />;
  }
};

const ActivityCardComponent: React.FC<Props> = ({ activity }) => {
  if (activity.type === 'new_post') {
    return (
      <Card style={styles.card} accessible accessibilityRole="summary">
        <Card.Title
          title={activity.title}
          subtitle={formatDate(activity.date)}
          left={LeftIcon(activity.type)}
        />
        <Card.Cover source={{ uri: activity.thumbnailUrl }} style={styles.cover} />
      </Card>
    );
  }

  if (activity.type === 'sale_completed') {
    return (
      <Card style={styles.card} accessible accessibilityRole="summary">
        <Card.Title
          title={`Venda: ${activity.productName}`}
          subtitle={formatDate(activity.date)}
          left={LeftIcon(activity.type)}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.detailText}>
            Valor: {currencyBRL.format(activity.amount)}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (activity.type === 'rating_received') {
    return (
      <Card style={styles.card} accessible accessibilityRole="summary">
        <Card.Title
          title={`Avaliação recebida`}
          subtitle={formatDate(activity.date)}
          left={LeftIcon(activity.type)}
        />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="titleMedium" style={styles.rating}>{'★'.repeat(activity.rating)}</Text>
            <Text variant="bodyMedium" style={styles.detailText}>
              {activity.rating} de 5
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Title title={activity.title} subtitle={formatDate(activity.date)} left={LeftIcon(activity.type)} />
    </Card>
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
  cover: {
    height: 180,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#F5A623',
    marginRight: spacing.xs,
  },
  detailText: {
    color: colors.textSecondary,
  },
});

export default ActivityCard;
