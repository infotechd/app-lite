// packages/mobile/src/components/profile/AchievementDetailModal.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, AccessibilityInfo, findNodeHandle, Image } from 'react-native';
import { Modal, Portal, Text, Button, ProgressBar } from 'react-native-paper';
import { Achievement } from '@/types/achievements';
import { colors, spacing, radius } from '@/styles/theme';

interface AchievementDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  achievement: Achievement | null;
}

const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  visible,
  onDismiss,
  achievement,
}) => {
  const titleRef = useRef<any>(null);

  useEffect(() => {
    if (visible && titleRef.current) {
      const tag = findNodeHandle(titleRef.current);
      if (tag) {
        setTimeout(() => AccessibilityInfo.setAccessibilityFocus(tag), 200); // Delay para garantir que o modal esteja pronto
      }
    }
  }, [visible]);

  if (!achievement) return null;

  const progressValue = achievement.progress
    ? achievement.progress.current / achievement.progress.total
    : 0;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View
          style={styles.content}
          accessibilityLabel={`Detalhes da conquista: ${achievement.title}`}
        >
          <Image
            source={{ uri: achievement.iconUrl }}
            style={styles.icon}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text
            ref={titleRef}
            style={styles.title}
            variant="headlineSmall"
            accessibilityRole="header"
          >
            {achievement.title}
          </Text>
          <Text style={styles.description}>{achievement.description}</Text>
          <Text style={styles.criteria}>Critério: {achievement.criteria}</Text>

          {achievement.progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>
                Progresso: {achievement.progress.current} de {achievement.progress.total}
              </Text>
              <ProgressBar progress={progressValue} color={colors.primary} style={styles.progressBar} />
            </View>
          )}

          {achievement.isUnlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Desbloqueado em: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}

          <Button
            onPress={onDismiss}
            mode="contained"
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            accessibilityHint="Fecha a janela de detalhes da conquista"
          >
            Fechar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: radius.lg,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radius.round,
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  criteria: {
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  progressLabel: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: radius.sm,
  },
  unlockedDate: {
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  closeButton: {
    marginTop: spacing.md,
  },
});

export default AchievementDetailModal;

