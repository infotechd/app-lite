import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';

interface KpiProps { label: string; value: string | number }
const Kpi: React.FC<KpiProps> = ({ label, value }) => (
  <View
    style={styles.container}
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${label}: ${value}`}
  >
    <Text variant="labelSmall" allowFontScaling accessibilityRole="text">{label}</Text>
    <Text variant="titleMedium" allowFontScaling accessibilityRole="text">{value}</Text>
  </View>
);

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
