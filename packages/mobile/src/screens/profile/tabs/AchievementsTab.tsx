import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '@/styles/theme';

const AchievementsTab: React.FC = () => {
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
