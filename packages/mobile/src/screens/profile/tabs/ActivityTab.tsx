import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';

const ActivityTab: React.FC = () => {
  const recentActivities = [
    { id: 1, type: 'oferta', title: 'Criação de Logo', date: '20/11/2025' },
    { id: 2, type: 'avaliação', title: 'Recebeu 5 estrelas de João S.', date: '19/11/2025' },
  ];

  return (
    <View style={styles.container}>
      {recentActivities.map((activity) => (
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
