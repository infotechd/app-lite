import React, { memo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import type { Interest } from './types';

interface InterestChipsProps {
  interests: Interest[];
  onPress?: (interest: Interest) => void;
}

const InterestChips: React.FC<InterestChipsProps> = ({ interests, onPress }) => {
  if (!interests?.length) return null;
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={interests}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ paddingHorizontal: spacing.md }}
      renderItem={({ item }) => (
        <View style={styles.itemWrapper}>
          <Chip
            compact
            onPress={onPress ? () => onPress(item) : undefined}
            style={styles.chip}
            accessibilityLabel={`Interesse: ${item.name}`}
          >
            {item.name}
          </Chip>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  itemWrapper: { marginRight: spacing.xs },
  chip: { backgroundColor: colors.surface },
});

export default memo(InterestChips);
