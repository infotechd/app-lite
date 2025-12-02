import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
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
import ProfileHighlights from '@/components/profile/highlights/ProfileHighlights';
import type { Badge, Interest } from '@/components/profile/highlights/types';

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Highlights (Conquistas + Interesses) */}
        {(() => {
          // Exibe dados mockados apenas em desenvolvimento.
          // Integração com dados reais pode mapear user.badges e user.interests aqui.
          if (__DEV__) {
            const MOCK_BADGES: Badge[] = [
              { id: '1', title: 'Pioneiro', description: 'Primeira oferta publicada', iconUrl: 'https://placekitten.com/200/200', earnedAt: '2025-07-25T10:00:00Z' },
              { id: '2', title: 'Top Avaliado', description: 'Média acima de 4.8', iconUrl: 'https://placekitten.com/201/201', earnedAt: '2025-08-02T10:00:00Z' },
              { id: '3', title: 'Explorador', description: 'Visitou 50 perfis', iconUrl: 'https://placekitten.com/202/202', earnedAt: '2025-08-13T10:00:00Z' },
            ];
            const MOCK_INTERESTS: Interest[] = [
              { id: 'a', name: 'Tecnologia' },
              { id: 'b', name: 'Esportes' },
              { id: 'c', name: 'Música' },
              { id: 'd', name: 'Viagens' },
            ];
            return <ProfileHighlights badges={MOCK_BADGES} interests={MOCK_INTERESTS} />;
          }
          return null;
        })()}

        <Divider style={{ marginVertical: spacing.lg }} />

        {/* Nova Seção de Confiança */}
        <TrustFooter user={user} />

        <Divider style={{ marginVertical: spacing.lg }} />
      </ScrollView>

      {/* Conteúdo em abas (fora do ScrollView para evitar listas aninhadas) */}
      <View style={styles.tabsContainer}>
        <ProfileTabs isLoading={isLoading && showSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
    tabsContainer: {
        flex: 1,
    },
    
});

export default ProfileHome;
