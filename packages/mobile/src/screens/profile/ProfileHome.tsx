import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileHeaderSkeleton from '@/components/profile/skeletons/ProfileHeaderSkeleton';
import ProfileTabs from './ProfileTabs';
import { TrustFooter } from '@/components/profile/TrustFooter';
import AnalyticsService from '@/services/AnalyticsService';
import { ProfileCompletionChecklist } from '@/components/profile/ProfileCompletionChecklist';
import { calculateProfileCompletion } from '@/utils/profile/calculateProfileCompletion';
import { getProfileChecklistItems } from '@/utils/profile/getProfileChecklistItems';
import sessionStore from '@/state/session/sessionStore';

const ProfileHome: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false); // evita flicker
  const [checklistDismissed, setChecklistDismissed] = useState(sessionStore.profileChecklistDismissed); // sessão atual
  const [checklistImpressionSent, setChecklistImpressionSent] = useState(false);

  useEffect(() => {
    // Dispara evento de visualização do perfil na montagem
    const profile_id = (user as any)?.id ?? 'unknown';
    const source = 'unknown';
    AnalyticsService.track('profile_view', { profile_id, source });

    // Delay para evitar piscada em carregamentos muito rápidos
    const delay = setTimeout(() => setShowSkeleton(true), 200);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowSkeleton(false);
    }, 2000);
    return () => {
      clearTimeout(timer);
      clearTimeout(delay);
    };
  }, []);

  const completion = useMemo(() => (user ? calculateProfileCompletion(user as any) : 100), [user]);
  const shouldShowChecklist = !checklistDismissed && completion < 100 && !isLoading;

  useEffect(() => {
    if (shouldShowChecklist && !checklistImpressionSent && user) {
      const items = getProfileChecklistItems(user as any);
      const missing = items.filter((i) => !i.isComplete).length;
      AnalyticsService.track('profile_checklist_impression', { completion, missing_count: missing });
      setChecklistImpressionSent(true);
    }
  }, [shouldShowChecklist, checklistImpressionSent, user, completion]);

  return (
    <View style={styles.container}>
      {isLoading && showSkeleton ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader user={user} />
      )}

      {shouldShowChecklist ? (
        <View style={{ marginTop: spacing.md }}>
          <ProfileCompletionChecklist
            user={user as any}
            onDismiss={() => {
              sessionStore.dismissProfileChecklist();
              setChecklistDismissed(true);
            }}
          />
        </View>
      ) : null}

      <Divider style={{ marginVertical: spacing.lg }} />

      {/* Nova Seção de Confiança */}
      <TrustFooter user={user} />

      <Divider style={{ marginVertical: spacing.lg }} />

      {/* Conteúdo em abas */}
      <View style={styles.tabsContainer}>
        <ProfileTabs isLoading={isLoading && showSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    tabsContainer: {
        flex: 1,
    },
    
});

export default ProfileHome;
