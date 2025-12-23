// packages/mobile/src/components/profile/AchievementGrid.tsx
import React from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { Achievement } from '@/types/achievements';
import AchievementCard from './AchievementCard';

interface AchievementGridProps {
  achievements: Achievement[];
  onAchievementPress: (item: Achievement) => void;
}

const AchievementGrid: React.FC<AchievementGridProps> = ({
  achievements,
  onAchievementPress,
}) => {
  return (
    <FlatList
      data={achievements}
      renderItem={({ item }) => (
        <AchievementCard item={item} onPress={onAchievementPress} />
      )}
      keyExtractor={(item) => item.id}
      numColumns={4}
      style={styles.grid}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-around',
  },
});

export default AchievementGrid;

