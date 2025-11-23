import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { spacing } from '@/styles/theme';

const AboutTab: React.FC = () => {
  const { user } = useAuth();

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
