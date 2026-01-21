import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Keyboard } from 'react-native';
import { showAlert } from '@/utils/alert';
import { Text, TextInput, Button, Appbar, ActivityIndicator, Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import AvatarEditor from '@/components/profile/AvatarEditor';
import { colors, spacing } from '@/styles/theme';
import { 
  updateName as updateNameService,
  updatePhone as updatePhoneService,
  updateLocation as updateLocationService,
  updateEmail as updateEmailService,
  confirmEmailChange as confirmEmailChangeService,
} from '@/services/profileService';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneFormatter';

/**
 * Tela de Edição de Perfil (Versão 2.0).
 * Centraliza a edição de avatar e futuramente outros dados do usuário.
 * 
 * Correção aplicada: O TouchableWithoutFeedback foi substituído por Pressable
 * com verificação de target para não interferir nos inputs na versão Web.
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
  const [email, setEmail] = useState(user?.email ?? '');
  const [isEmailChanged, setIsEmailChanged] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmingToken, setConfirmingToken] = useState(false);
  const [token, setToken] = useState('');

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

  // Lógica de validação do e-mail
  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isEmailValid = useMemo(() => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(trimmedEmail), [trimmedEmail]);

  // O botão salvar é habilitado se houver mudanças E tudo for válido
  const canSave = (isNameValid && isPhoneValid && isCidadeValid && isEstadoValid) && 
                 (isNameChanged || isPhoneChanged || isLocationChanged || isEmailChanged);

  /**
   * Handler para dispensar o teclado apenas em plataformas nativas.
   * Na Web, o Keyboard.dismiss() pode interferir no foco dos inputs.
   */
  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

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

      // Se o e-mail mudou, pede confirmação de senha e envia solicitação
      if (isEmailChanged) {
        setPasswordModalVisible(true);
        setIsSaving(false);
        return;
      }

      await setUser(updatedUser);
      showAlert('Sucesso', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (error: any) {
      showAlert('Erro', error?.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPassword = async () => {
    try {
      setIsSaving(true);
      const { message } = await updateEmailService(trimmedEmail, currentPassword);
      showAlert('Solicitação enviada', message);
      setPasswordModalVisible(false);
      setCurrentPassword('');
    } catch (error: any) {
      showAlert('Erro', error?.message || 'Não foi possível solicitar a alteração de e-mail.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToken = async () => {
    try {
      setConfirmingToken(true);
      const updatedUser = await confirmEmailChangeService(token.trim());
      await setUser(updatedUser);
      setEmail(updatedUser.email);
      setIsEmailChanged(false);
      setToken('');
      showAlert('Sucesso', 'E-mail atualizado com sucesso.');
      navigation.goBack();
    } catch (error: any) {
      showAlert('Erro', error?.message || 'Token inválido ou expirado.');
    } finally {
      setConfirmingToken(false);
    }
  };

  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Editar Perfil" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >

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
                value={email}
                mode="outlined"
                onChangeText={(text) => {
                  setEmail(text);
                  setIsEmailChanged(text.trim().toLowerCase() !== (user?.email ?? '').toLowerCase());
                }}
                style={styles.input}
                error={!!email && !isEmailValid}
                right={isEmailChanged ? <TextInput.Icon icon="email-edit" /> : undefined}
                autoCapitalize="none"
                keyboardType="email-address"
              />


                mode="contained"
                onPress={handleSave}
                disabled={!canSave || isSaving}
                loading={isSaving}
                style={styles.moreButton}
              >
                Salvar
              </Button>

              {isEmailChanged && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text variant="bodySmall" style={styles.helperText}>
                    Para confirmar a troca de e-mail enviaremos um token para o novo endereço.
                  </Text>
                  <TextInput
                    label="Token de confirmação"
                    value={token}
                    mode="outlined"
                    onChangeText={setToken}
                    style={styles.input}
                    right={confirmingToken ? <ActivityIndicator size="small" /> : undefined}
                    placeholder="Cole o token recebido"
                    autoCapitalize="none"
                  />
                  <Button
                    mode="outlined"
                    onPress={handleConfirmToken}
                    disabled={!token || confirmingToken}
                    loading={confirmingToken}
                  >
                    Confirmar e-mail
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={passwordModalVisible} onDismiss={() => setPasswordModalVisible(false)}>
          <Dialog.Title>Confirme sua senha</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Senha atual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordModalVisible(false)}>Cancelar</Button>
            <Button onPress={handleConfirmPassword} disabled={!currentPassword || isSaving} loading={isSaving}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  pressableContainer: {
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
