import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import AvatarEditor from '@/components/profile/AvatarEditor';
import { colors, spacing } from '@/styles/theme';
import { 
  updateName as updateNameService,
  updatePhone as updatePhoneService 
} from '@/services/profileService';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneFormatter';

/**
 * Tela de Edição de Perfil (Versão 2.0).
 * Centraliza a edição de avatar e futuramente outros dados do usuário.
 */
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  
  // Estados para os campos do formulário
  const [nome, setNome] = useState(user?.nome ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Lógica de validação do Nome
  const trimmedName = useMemo(() => nome.replace(/\s+/g, ' ').trim(), [nome]);
  const onlyLetters = useMemo(() => /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(trimmedName || ''), [trimmedName]);
  const isNameValid = trimmedName.length >= 3 && trimmedName.length <= 50 && onlyLetters;
  const isNameChanged = trimmedName !== (user?.nome ?? '').trim();

  // Lógica de validação do Telefone
  // O telefone é opcional, mas se preenchido deve ser válido.
  const isPhoneValid = !telefone || isValidPhoneNumber(telefone);
  const isPhoneChanged = telefone !== (user?.telefone ?? '');

  // O botão salvar é habilitado se houver mudanças E tudo for válido
  const canSave = (isNameValid && isPhoneValid) && (isNameChanged || isPhoneChanged);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setIsSaving(true);
      let updatedUser = { ...user } as any;

      // Se o nome mudou, atualiza
      if (isNameChanged) {
        updatedUser = await updateNameService(trimmedName);
      }

      // Se o telefone mudou, atualiza
      if (isPhoneChanged) {
        updatedUser = await updatePhoneService(telefone);
      }

      await setUser(updatedUser);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar o perfil.');
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
            error={!!nome && !isNameValid}
            right={isSaving ? <ActivityIndicator size="small" /> : undefined}
          />
          <Text variant="bodySmall" style={styles.helperText}>
            Use apenas letras e espaços, entre 3 e 50 caracteres. Removemos espaços duplicados automaticamente.
          </Text>

          <TextInput
            label="Telefone"
            value={telefone}
            mode="outlined"
            onChangeText={(text) => setTelefone(formatPhoneNumber(text))}
            style={styles.input}
            keyboardType="phone-pad"
            error={!!telefone && !isPhoneValid}
            placeholder="(11) 99999-9999"
          />
          <Text variant="bodySmall" style={styles.helperText}>
            Obrigatório para facilitar o contato de interessados.
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
            disabled={!canSave || isSaving}
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
