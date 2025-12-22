import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import AvatarEditor from '@/components/profile/AvatarEditor';
import { colors, spacing } from '@/styles/theme';
import { updateName as updateNameService } from '@/services/profileService';

/**
 * Tela de Edição de Perfil (Versão 2.0).
 * Centraliza a edição de avatar e futuramente outros dados do usuário.
 */
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const trimmed = useMemo(() => nome.replace(/\s+/g, ' ').trim(), [nome]);
  const onlyLetters = useMemo(() => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(trimmed || ''), [trimmed]);
  const isValid = trimmed.length >= 3 && trimmed.length <= 50 && onlyLetters;
  const isChanged = trimmed !== (user?.nome ?? '').trim();

  const handleSave = async () => {
    if (!isValid || !isChanged) return;
    try {
      setIsSaving(true);
      const updated = await updateNameService(trimmed);
      await setUser(updated);
      Alert.alert('Sucesso', 'Nome atualizado com sucesso.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar o nome.');
    } finally {
      setIsSaving(false);
    }
  };

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
            value={nome}
            mode="outlined"
            onChangeText={setNome}
            style={styles.input}
            error={!!nome && !isValid}
            right={isSaving ? <ActivityIndicator size="small" /> : undefined}
          />
          <Text variant="bodySmall" style={styles.helperText}>
            Use apenas letras e espaços, entre 3 e 50 caracteres. Removemos espaços duplicados automaticamente.
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
            mode="contained"
            onPress={handleSave}
            disabled={!isValid || !isChanged || isSaving}
            loading={isSaving}
            style={styles.moreButton}
          >
            Salvar
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
