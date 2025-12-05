import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import type { Achievement } from '@/types/achievements';

interface Props {
  achievements: Achievement[];
  // opcional: nível/ranking baseado na %
  showLevel?: boolean;
}

const AchievementsSummary: React.FC<Props> = ({ achievements, showLevel = true }) => {
  const { unlocked, total, ratio, level } = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter((a) => a.isUnlocked).length;
    const ratio = total > 0 ? unlocked / total : 0;
    // Exemplo simples de nível: 0–33% Iniciante, 34–66% Intermediário, 67–100% Pro
    const level = ratio >= 0.67 ? 'Pro' : ratio >= 0.34 ? 'Intermediário' : 'Iniciante';
    return { unlocked, total, ratio, level };
  }, [achievements]);

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" accessibilityRole="header">
        {unlocked} de {total} conquistas
      </Text>
      <ProgressBar style={styles.progress} progress={isNaN(ratio) ? 0 : ratio} />
      {showLevel && (
        <Text variant="bodySmall" style={styles.level}>
          Nível: {level}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  progress: { marginTop: spacing.xs, height: 8, borderRadius: 4 },
  level: { marginTop: spacing.xs, opacity: 0.7 },
});

export default memo(AchievementsSummary);

