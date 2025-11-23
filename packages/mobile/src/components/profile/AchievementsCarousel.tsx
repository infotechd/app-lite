import React, { memo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';

export interface AchievementItem {
  id: string;
  icon: string; // MaterialCommunityIcons name, ex: 'trophy'
  title: string;
}

interface AchievementsCarouselProps {
  achievements: AchievementItem[];
}

const AchievementsCarousel: React.FC<AchievementsCarouselProps> = ({ achievements }) => {
  if (!achievements?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="Carrossel de conquistas"
    >
      {achievements.map((ach) => (
        <View
          key={ach.id}
          style={styles.card}
          accessible
          accessibilityLabel={`Conquista: ${ach.title}`}
        >
          <Avatar.Icon
            icon={ach.icon as any}
            size={spacing.xl + spacing.md}
            style={styles.avatar}
          />
          <Text variant="labelMedium" style={styles.title} numberOfLines={2}>
            {ach.title}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    width: spacing.xl * 4 + spacing.md, // ~144
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.text,
  },
});

export default memo(AchievementsCarousel);
