// packages/mobile/src/components/profile/ProfileCompletionChecklist.tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User } from '@/types';
import { colors, spacing, typography } from '@/styles/theme';
import { getProfileChecklistItems } from '@/utils/profile/getProfileChecklistItems';
import { calculateProfileCompletion } from '@/utils/profile/calculateProfileCompletion';
import { THEME_CONFIG } from '@/constants/config';
import AnalyticsService from '@/services/AnalyticsService';

export interface ProfileCompletionChecklistProps {
  user: User;
  onDismiss: () => void;
  navigate?: (route: string) => void;
}

const StatusIcon: React.FC<{ done: boolean }> = ({ done }) => {
  return (
    <View
      accessibilityLabel={done ? 'Concluído' : 'Pendente'}
      style={[
        styles.statusIcon,
        done
          ? { backgroundColor: THEME_CONFIG.colors.success, borderWidth: 0 }
          : { backgroundColor: 'transparent', borderColor: colors.border },
      ]}
    >
      {done ? <Text style={styles.statusIconText}>✓</Text> : null}
    </View>
  );
};

export const ProfileCompletionChecklist: React.FC<ProfileCompletionChecklistProps> = ({ user, onDismiss, navigate }) => {
  const items = useMemo(() => getProfileChecklistItems(user, navigate), [user, navigate]);
  const completion = useMemo(() => calculateProfileCompletion(user), [user]);

  if (completion >= 100) return null;

  const progressPct = Math.max(0, Math.min(100, completion));

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`Checklist de perfil, ${progressPct}% completo`}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Complete seu perfil</Text>
          <Text style={styles.subtitle}>{progressPct}% completo</Text>
        </View>
        <Pressable
          onPress={() => {
            AnalyticsService.track('profile_checklist_dismiss', { completion: progressPct });
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel="Dispensar checklist"
          hitSlop={8}
          style={styles.dismissBtn}
        >
          <Text style={styles.dismissText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={{ gap: spacing.sm }}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <StatusIcon done={item.isComplete} />
              <Text style={[styles.itemText, item.isComplete && styles.itemDone]}>{item.title}</Text>
            </View>
            {!item.isComplete ? (
              <Pressable
                onPress={() => {
                  AnalyticsService.track('profile_checklist_item_click', { item_id: item.id });
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ação: ${item.title}`}
              >
                <Text style={styles.actionText}>Adicionar</Text>
              </Pressable>
            ) : (
              <Text style={styles.doneText}>Feito</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_CONFIG.colors.surface,
    borderRadius: THEME_CONFIG.borderRadius.lg,
    padding: THEME_CONFIG.spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...THEME_CONFIG.shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dismissBtn: {
    padding: spacing.sm,
  },
  dismissText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#EDEFF2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME_CONFIG.colors.primary,
    borderRadius: 999,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
  },
  itemDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  actionText: {
    color: THEME_CONFIG.colors.primary,
    fontWeight: '700',
  },
  doneText: {
    color: THEME_CONFIG.colors.success,
    fontWeight: '700',
  },
  statusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusIconText: {
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 16,
  },
});

export default ProfileCompletionChecklist;
