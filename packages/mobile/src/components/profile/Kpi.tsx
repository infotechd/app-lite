import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

interface KpiProps {
  label: string;
  value: string;
}

const Kpi: React.FC<KpiProps> = ({ label, value }) => {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.value}>{value}</Text>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4, // evita corte do label em densidades maiores
  },
  value: {
    // Destaque para o valor
  },
  label: {
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14, // ajuda a não truncar em bodySmall
  },
});

export default Kpi;
