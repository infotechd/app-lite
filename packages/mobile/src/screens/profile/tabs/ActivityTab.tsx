import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';
import ActivityTabSkeleton from '@/components/profile/skeletons/ActivityTabSkeleton';
import EmptyState from '@/components/common/EmptyState';

interface Props {
  isLoading?: boolean;
}

const ActivityTab: React.FC<Props> = ({ isLoading }) => {
  // Simulação de carga de atividades do usuário
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    setAttempt((a) => a + 1);
    try {
      // Simula tempo de rede (evita delay em ambiente de teste)
      const isTest = (globalThis as any)?.__TEST__ === true;
      if (!isTest) {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Primeira tentativa falha para simular erro/offline
      if (attempt === 0) {
        throw new Error('Simulated error');
      }

      // Sucesso: simula lista vazia (estado de vazio)
      setData([]);
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

  const isLoadingEffective = useMemo(() => Boolean(isLoading) || loading, [isLoading, loading]);

  if (isLoadingEffective) {
    return <ActivityTabSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        testID="activity-error"
        title="Oops, algo deu errado"
        description="Não foi possível carregar o conteúdo. Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onPress: load }}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        testID="activity-empty"
        title="Nenhuma atividade por aqui"
        description="Suas publicações, ofertas e avaliações aparecerão aqui."
      />
    );
  }

  return (
    <View style={styles.container}>
      {data.map((activity: any) => (
        <Card key={activity.id} style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">{activity.title}</Text>
            <Text variant="bodySmall">{activity.date}</Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  card: { marginBottom: spacing.sm },
});

export default ActivityTab;
