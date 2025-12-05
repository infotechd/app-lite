import React, { memo, useCallback } from 'react';
import { FlatList, ListRenderItem, StyleSheet } from 'react-native';
import type { Achievement } from '@/types/achievements';
import AchievementCard from './AchievementCard';

interface Props {
  data: Achievement[];
  columns?: 2 | 3;
  onPressItem: (item: Achievement) => void;
  testID?: string;
}

const keyExtractor = (item: Achievement) => item.id;

const AchievementGrid: React.FC<Props> = ({ data, columns = 2, onPressItem, testID }) => {
  const renderItem = useCallback<ListRenderItem<Achievement>>(    ({ item }) => <AchievementCard item={item} onPress={onPressItem} testID={`achievement-card-${item.id}`} />,    [onPressItem]
  );

  return (
    <FlatList
      testID={testID}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={columns}
      contentContainerStyle={styles.content}
      columnWrapperStyle={columns > 1 ? styles.wrapper : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  wrapper: { justifyContent: 'space-between' },
});

export default memo(AchievementGrid);

