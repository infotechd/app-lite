import React, { memo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { Achievement } from '@/types/achievements';
import { spacing } from '@/styles/theme';

interface Props {
  item: Achievement;
  onPress: (item: Achievement) => void;
  testID?: string;
}

const AchievementCard: React.FC<Props> = ({ item, onPress, testID }) => {
  const theme = useTheme();
  const locked = !item.isUnlocked;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      testID={testID}
    >
      <View style={styles.iconWrap}>
        <Image
          source={{ uri: item.iconUrl }}
          style={[styles.icon, locked && styles.locked]}
          resizeMode="contain"
          accessibilityLabel={item.title}
        />
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
      {locked && (
        <Text style={styles.lockText} accessibilityHint="Conquista bloqueada">🔒</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.xs,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { width: '100%', alignItems: 'center', marginBottom: spacing.xs },
  icon: { width: 64, height: 64 },
  locked: { tintColor: '#999999' }, // efeito escala de cinza simples
  title: { textAlign: 'center', marginTop: spacing.xs },
  lockText: { marginTop: spacing.xs, opacity: 0.7 },
});

export default memo(AchievementCard);

