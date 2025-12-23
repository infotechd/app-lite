// packages/mobile/src/components/profile/AchievementCard.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Achievement } from '@/types/achievements';
import { colors, spacing, radius } from '@/styles/theme';

interface AchievementCardProps {
  item: Achievement;
  onPress: (item: Achievement) => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ item, onPress }) => {
  const isUnlocked = item.isUnlocked;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={[styles.container, !isUnlocked && styles.locked]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${isUnlocked ? '' : ', bloqueado'}`}
      accessibilityHint="Toque para ver detalhes da conquista"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Image
        source={{ uri: item.iconUrl }}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text
        variant="labelSmall"
        style={styles.title}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    alignItems: 'center',
    margin: spacing.sm,
  },
  locked: {
    opacity: 0.5,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.backdrop, // Placeholder color
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default AchievementCard;

