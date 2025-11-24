import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { Review } from '@/types/reviews';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { relativeDate } from '@/utils/reviews';

export type ReviewCardProps = { review: Review };

const Stars = ({ rating }: { rating: number }) => (
  <Text accessibilityRole="image" accessibilityLabel={`${rating} de 5 estrelas`} style={styles.stars}>
    {[1, 2, 3, 4, 5]
      .map((i) => (i <= rating ? '★' : '☆'))
      .join(' ')}
  </Text>
);

const ReviewCardComponent: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: review.user.avatarUrl || 'https://picsum.photos/seed/placeholder/80' }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {review.user.name}
          </Text>
          <Text style={styles.date}>{relativeDate(review.createdAt)}</Text>
        </View>
        <Stars rating={review.rating} />
      </View>

      {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}

      {!!review.photos?.length && (
        <View style={styles.photosRow}>
          {review.photos.map((uri, idx) => (
            <Image key={`${review.id}-p-${idx}`} source={{ uri }} style={styles.photo} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm, backgroundColor: colors.border },
  name: { ...typography.h3, fontSize: 16, color: colors.text },
  date: { ...typography.caption, color: colors.textSecondary },
  stars: { color: colors.warning, marginLeft: spacing.sm },
  comment: { ...typography.body, color: colors.text, marginTop: spacing.xs, marginBottom: spacing.sm, lineHeight: 20 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any },
  photo: { width: 100, height: 100, borderRadius: radius.md, marginRight: spacing.xs, marginBottom: spacing.xs, backgroundColor: colors.border },
});

export const ReviewCard = React.memo(ReviewCardComponent);
export default ReviewCard;
