import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '@/styles/theme';
import { User } from '@/types';
import { formatJoinDate } from '@/utils/formatters';

type TrustItemProps = {
  icon: string;
  text: string;
  verified?: boolean;
  action?: boolean;
  futureFeature?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const TrustItem: React.FC<TrustItemProps> = ({
  icon,
  text,
  verified,
  action,
  futureFeature,
  onPress,
  style,
  textStyle,
}) => {
  const content = (
    <View style={[styles.item, style]}> 
      <View style={styles.itemLeft}>
        <Icon name={icon as any} size={20} color={futureFeature ? colors.textSecondary : colors.text} style={{ marginRight: spacing.sm }} />
        <Text style={[styles.itemText, futureFeature ? { color: colors.textSecondary } : null, textStyle]}>{text}</Text>
      </View>
      <View style={styles.itemRight}>
        {verified ? (
          <Icon name="check-circle-outline" size={20} color={colors.success} />
        ) : action ? (
          <Icon name="chevron-right" size={22} color={colors.textSecondary} />
        ) : null}
      </View>
    </View>
  );

  if (action && onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} style={{ width: '100%' }}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export interface TrustFooterProps {
  user: User | null;
}

export const TrustFooter: React.FC<TrustFooterProps> = ({ user }) => {
  if (!user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confiança e Segurança</Text>

      <TrustItem
        icon="calendar-month-outline"
        text={`Membro desde ${formatJoinDate(user.createdAt)}`}
      />

      <TrustItem
        icon="email-outline"
        text="E-mail verificado"
        verified={!!user.email}
      />

      <TrustItem
        icon="phone-outline"
        text="Telefone verificado"
        verified={!!user.telefone}
        action={!user.telefone}
      />

      <TrustItem
        icon="file-document-outline"
        text="Documento verificado"
        verified={false}
        futureFeature
      />

      <TrustItem
        icon="shield-lock-outline"
        text="Políticas de Privacidade"
        action
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  itemRight: {
    marginLeft: spacing.sm,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
});

export default TrustFooter;
