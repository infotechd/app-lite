import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/styles/theme';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
};

export type EmptyStateProps = {
  illustration?: React.ReactNode | { uri: string } | number;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  testID?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  action,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      {renderIllustration(illustration)}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={styles.button}
          testID={testID ? `${testID}-button` : undefined}
        >
          <Text style={styles.buttonLabel}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
};

function renderIllustration(illustration: EmptyStateProps['illustration']) {
  if (!illustration) return null;
  if (React.isValidElement(illustration)) {
    return <View style={styles.illustration}>{illustration}</View>;
  }
  if (typeof illustration === 'number' || (typeof illustration === 'object' && 'uri' in illustration)) {
    return <Image source={illustration as any} style={styles.image} resizeMode="contain" />;
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  illustration: {
    marginBottom: spacing.lg,
  },
  image: {
    width: 160,
    height: 160,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EmptyState;
