import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/styles/theme';
import EmptyState from '@/components/common/EmptyState';
import AchievementsSummary from '@/components/achievements/AchievementsSummary';
import AchievementGrid from '@/components/achievements/AchievementGrid';
import AchievementDetailModal from '@/components/achievements/AchievementDetailModal';
import { ACHIEVEMENTS_MOCK } from '@/mocks/achievements.mock';
import type { Achievement } from '@/types/achievements';

const AchievementsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [data, setData] = useState<Achievement[]>([]);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      // Simulação de fetch. No futuro: chamar API e normalizar.
      await new Promise((r) => setTimeout(r, 300));
      setData(ACHIEVEMENTS_MOCK);
    } catch (e) {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPressItem = useCallback((item: Achievement) => {
    setSelected(item);
    setModalVisible(true);
    // Futuro: se item recém-desbloqueado, disparar microinteração (confetes)
  }, []);

  const hasAny = data && data.length > 0;

  if (loading) {
    return <View style={{ flex: 1 }} />;
  }

  if (isError) {
    return (
      <EmptyState
        testID="achievements-error"
        title="Oops, algo deu errado"
        description="Não foi possível carregar o conteúdo. Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onPress: load }}
      />
    );
  }

  if (!hasAny) {
    return (
      <EmptyState
        testID="achievements-empty"
        title="Sem conquistas ainda"
        description="Explore e participe para desbloquear suas primeiras conquistas!"
      />
    );
  }

  return (
    <View style={styles.container}>
      <AchievementsSummary achievements={data} />
      <AchievementGrid data={data} columns={2} onPressItem={onPressItem} testID="achievements-grid" />

      <AchievementDetailModal
        visible={modalVisible}
        achievement={selected}
        onDismiss={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
});

export default AchievementsTab;


