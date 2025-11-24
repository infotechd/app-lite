import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { spacing } from '@/styles/theme';
import EmptyState from '@/components/common/EmptyState';

const AboutTab: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    setAttempt((a) => a + 1);
    try {
      await new Promise((r) => setTimeout(r, 400));
      // primeira tentativa: simula erro/offline
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
    return <View style={{ flex: 1 }} />; // poderia usar um Skeleton específico no futuro
  }

  if (isError) {
    return (
      <EmptyState
        testID="about-error"
        title="Oops, algo deu errado"
        description="Não foi possível carregar o conteúdo. Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onPress: load }}
      />
    );
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const createdAtText = createdAt && !isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString()
    : 'Não informado';

  const cidade = user?.localizacao?.cidade ?? 'Não informado';
  const estado = user?.localizacao?.estado ?? '';

  return (
    <View style={styles.container}>
      <List.Item
        title="Nome Completo"
        description={user?.nome ?? 'Não informado'}
        left={(props) => <List.Icon {...props} icon="account" />}
      />
      <List.Item
        title="Desde"
        description={createdAtText}
        left={(props) => <List.Icon {...props} icon="calendar-check" />}
      />
      <List.Item
        title="Localização"
        description={`${cidade}${estado ? `, ${estado}` : ''}`}
        left={(props) => <List.Icon {...props} icon="map-marker" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.sm },
});

export default AboutTab;
