import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
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
import { useAuth } from '@/context/AuthContext';

/**
 * Interface que define as propriedades aceitas pelo componente UserProfileView.
 * 
 * @interface Props
 * @property {boolean} isLoading - Indica se os dados do perfil ainda estão sendo carregados.
 * @property {boolean} showSkeleton - Define se o componente de esqueleto (skeleton) deve ser exibido durante o carregamento.
 */
interface Props {
  isLoading: boolean;
  showSkeleton: boolean;
}

/**
 * Componente que renderiza a visualização do perfil do usuário logado.
 * Este componente gerencia a exibição do cabeçalho, checklist de conclusão,
 * destaques (conquistas e interesses), rodapé de confiança e abas de conteúdo.
 *
 * @component
 * @param {Props} props - As propriedades do componente.
 * @returns {JSX.Element} O elemento JSX que representa a tela de perfil do usuário.
 */
const UserProfileView: React.FC<Props> = ({ isLoading, showSkeleton }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Estado para controlar se o checklist de conclusão de perfil foi descartado pelo usuário
  const [checklistDismissed, setChecklistDismissed] = React.useState(sessionStore.profileChecklistDismissed);
  
  // Estado para garantir que o evento de impressão do checklist seja enviado apenas uma vez por sessão de visualização
  const [checklistImpressionSent, setChecklistImpressionSent] = React.useState(false);

  // Calcula a porcentagem de conclusão do perfil de forma memorizada
  const completion = React.useMemo(() => (user ? calculateProfileCompletion(user as any) : 100), [user]);
  
  // Determina se o checklist deve ser exibido com base no status de descarte, conclusão e carregamento
  const shouldShowChecklist = !checklistDismissed && completion < 100 && !isLoading;

  // Efeito para rastrear a visualização do perfil no Analytics
  React.useEffect(() => {
    const profile_id = (user as any)?.id ?? 'unknown';
    const source = 'unknown';
    AnalyticsService.track('profile_view', { profile_id, source });
  }, [user]);

  // Efeito para rastrear a impressão (visualização) do checklist de conclusão
  React.useEffect(() => {
    if (shouldShowChecklist && !checklistImpressionSent && user) {
      const items = getProfileChecklistItems(user as any);
      const missing = items.filter((i) => !i.isComplete).length;
      AnalyticsService.track('profile_checklist_impression', { completion, missing_count: missing });
      setChecklistImpressionSent(true);
    }
  }, [shouldShowChecklist, checklistImpressionSent, user, completion]);

  return (
    <View style={styles.container}>
      {/* Renderiza o esqueleto de carregamento ou o cabeçalho real do perfil */}
      {isLoading && showSkeleton ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader user={user} profileId={(user as any)?.id ?? 'unknown'} />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Exibe o checklist de conclusão se as condições forem atendidas */}
        {shouldShowChecklist ? (
          <View style={{ marginTop: spacing.md }}>
            <ProfileCompletionChecklist
              user={user as any}
              navigate={(route) => (navigation as any).navigate(route)}
              onDismiss={() => {
                sessionStore.dismissProfileChecklist();
                setChecklistDismissed(true);
              }}
            />
          </View>
        ) : null}

        {/* Bloco condicional para exibir destaques (conquistas e interesses) em ambiente de desenvolvimento */}
        {(() => {
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
        {/* Rodapé que exibe informações de confiança do usuário */}
        <TrustFooter user={user} />
        <Divider style={{ marginVertical: spacing.lg }} />
      </ScrollView>

      {/* Container das abas de navegação interna do perfil */}
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

export default UserProfileView;

