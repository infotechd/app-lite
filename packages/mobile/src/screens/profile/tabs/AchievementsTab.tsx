import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import EmptyState from '@/components/common/EmptyState';

const AchievementsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    setAttempt((a) => a + 1);
    try {
      await new Promise((r) => setTimeout(r, 400));
      if (attempt === 0) {
        throw new Error('Simulated error');
      }
    } catch (e) {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [attempt]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <View style={styles.container}>
      <Text>Conteúdo de Conquistas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
});

export default AchievementsTab;
