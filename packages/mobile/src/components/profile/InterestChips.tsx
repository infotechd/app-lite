import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

interface InterestChipsProps {
  interests: string[];
}

const InterestChips: React.FC<InterestChipsProps> = ({ interests }) => {
  if (!interests?.length) return null;

  return (
    <View style={styles.row} accessibilityLabel="Lista de interesses">
      {interests.map((label) => (
        <Chip
          key={label}
          style={styles.chip}
          disabled
          accessibilityLabel={`Interesse: ${label}`}
        >
          {label}
        </Chip>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  chip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
});

export default memo(InterestChips);
