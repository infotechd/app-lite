import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import AvatarEditor from '@/components/profile/AvatarEditor';
import { colors, spacing } from '@/styles/theme';

/**
 * Tela de Edição de Perfil (Versão 2.0).
 * Centraliza a edição de avatar e futuramente outros dados do usuário.
 */
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Editar Perfil" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Editor de Avatar - Ponto central da Versão 2.0 */}
        <AvatarEditor />

        <View style={styles.form}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Informações Básicas
          </Text>
          
          <TextInput
            label="Nome"
            value={user?.nome}
            mode="outlined"
            disabled
            style={styles.input}
            right={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
          />
          <Text variant="bodySmall" style={styles.helperText}>
            Para alterar seu nome, entre em contato com o suporte.
          </Text>

          <TextInput
            label="E-mail"
            value={user?.email}
            mode="outlined"
            disabled
            style={styles.input}
            right={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
          />

          <Button 
            mode="text" 
            onPress={() => { /* Navegar para edição de outros campos no futuro */ }}
            style={styles.moreButton}
          >
            Editar outros dados
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: 'white',
  },
  helperText: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  moreButton: {
    marginTop: spacing.md,
  }
});

export default EditProfileScreen;
