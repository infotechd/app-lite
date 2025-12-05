import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Modal, Portal, ProgressBar, Text, useTheme } from 'react-native-paper';
import type { Achievement } from '@/types/achievements';
import { spacing } from '@/styles/theme';

interface Props {
  visible: boolean;
  achievement?: Achievement | null;
  onDismiss: () => void;
}

const AchievementDetailModal: React.FC<Props> = ({ visible, achievement, onDismiss }) => {
  const theme = useTheme();
  if (!achievement) return null;
  const { title, description, criteria, isUnlocked, unlockedAt, progress } = achievement;

  const ratio = progress ? progress.current / progress.total : undefined;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge" style={styles.title}>{title}</Text>
        <Text variant="bodyMedium" style={styles.description}>{description}</Text>

        <View style={styles.section}>
          <Text variant="labelLarge">Como obter</Text>
          <Text variant="bodyMedium">{criteria}</Text>
        </View>

        {typeof ratio === 'number' && isFinite(ratio) && (
          <View style={styles.section}>
            <Text variant="labelLarge">Progresso</Text>
            <ProgressBar progress={Math.max(0, Math.min(1, ratio))} style={styles.progress} />
            <Text variant="bodySmall">{progress!.current} de {progress!.total}</Text>
          </View>
        )}

        {isUnlocked && unlockedAt && (
          <View style={styles.section}>
            <Text variant="labelLarge">Conquistado em</Text>
            <Text variant="bodySmall">{new Date(unlockedAt).toLocaleString()}</Text>
          </View>
        )}

        <Button mode="contained" onPress={onDismiss} style={{ marginTop: spacing.md }}>
          Fechar
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: spacing.md,
  },
  title: { marginBottom: spacing.xs },
  description: { opacity: 0.9 },
  section: { marginTop: spacing.md },
  progress: { height: 8, borderRadius: 4, marginTop: spacing.xs },
});

export default memo(AchievementDetailModal);

