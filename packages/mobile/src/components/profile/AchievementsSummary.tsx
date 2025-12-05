// packages/mobile/src/components/profile/AchievementsSummary.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Achievement } from '@/types/achievements';
import { spacing } from '@/styles/theme';
import AchievementGrid from './AchievementGrid';

interface AchievementsSummaryProps {
  achievements: Achievement[];
  onAchievementPress: (item: Achievement) => void;
  onViewAllPress: () => void;
}

const AchievementsSummary: React.FC<AchievementsSummaryProps> = ({
  achievements,
  onAchievementPress,
  onViewAllPress,
}) => {
  // Mostra apenas as 4 primeiras conquistas como uma prévia
  const summaryAchievements = achievements.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium">Conquistas</Text>
        <Button onPress={onViewAllPress}>Ver todas</Button>
      </View>
      <AchievementGrid
        achievements={summaryAchievements}
        onAchievementPress={onAchievementPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});

export default AchievementsSummary;

