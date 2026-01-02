import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, TextInput, Button, Appbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import AvatarEditor from '@/components/profile/AvatarEditor';
import { colors, spacing } from '@/styles/theme';
import { 
  updateName as updateNameService,
  updatePhone as updatePhoneService,
  updateLocation as updateLocationService 
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
  const [cidade, setCidade] = useState(user?.localizacao?.cidade ?? '');
  const [estado, setEstado] = useState(user?.localizacao?.estado ?? '');
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

  // Lógica de validação da Localização
  const isCidadeValid = !cidade || (cidade.trim().length >= 2 && cidade.trim().length <= 50);
  const isEstadoValid = !estado || estado.trim().length === 2;
  const isLocationChanged = cidade !== (user?.localizacao?.cidade ?? '') || estado !== (user?.localizacao?.estado ?? '');

  // O botão salvar é habilitado se houver mudanças E tudo for válido
  const canSave = (isNameValid && isPhoneValid && isCidadeValid && isEstadoValid) && 
                 (isNameChanged || isPhoneChanged || isLocationChanged);

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

      // Se a localização mudou, atualiza
      if (isLocationChanged) {
        updatedUser = await updateLocationService(cidade.trim(), estado.trim().toUpperCase());
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
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
          
          <View style={styles.row}>
            <TextInput
              label="Cidade"
              value={cidade}
              mode="outlined"
              onChangeText={setCidade}
              style={[styles.input, { flex: 3, marginRight: spacing.sm }]}
              error={!!cidade && !isCidadeValid}
              placeholder="Ex: São Paulo"
            />
            <TextInput
              label="UF"
              value={estado}
              mode="outlined"
              onChangeText={(text) => setEstado(text.toUpperCase().substring(0, 2))}
              style={[styles.input, { flex: 1 }]}
              error={!!estado && !isEstadoValid}
              placeholder="SP"
              autoCapitalize="characters"
            />
          </View>
          <Text variant="bodySmall" style={styles.helperText}>
            Cidade e Estado onde você atua ou reside.
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
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 4,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
