import React, { useMemo, useState, useCallback } from 'react';
import { Keyboard, ScrollView, StyleSheet, View, Pressable, Platform } from 'react-native';
import { showAlert } from '@/utils/alert';
import { Appbar, Button, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';
import { spacing } from '@/styles/theme';

/**
 * Tamanho mínimo permitido para a Razão Social da empresa.
 */
const MIN_RAZAO = 3;

/**
 * Tela de edição dos dados da empresa (PJ).
 * Permite que o usuário atualize a Razão Social e o Nome Fantasia associados à sua conta.
 *
 * @returns {React.JSX.Element} Componente de tela de edição de perfil empresarial.
 */
const EditProfileCompanyScreen: React.FC = () => {
  // Hooks para navegação e acesso aos dados de autenticação
  const navigation = useNavigation();
  const { user, setUser } = useAuth();

  // Estados locais para controlar os campos do formulário
  const [razaoSocial, setRazaoSocial] = useState(user?.razaoSocial ?? '');
  const [nomeFantasia, setNomeFantasia] = useState(user?.nomeFantasia ?? '');
  const [saving, setSaving] = useState(false); // Estado de carregamento durante a persistência

  // Validação: A Razão Social deve ter pelo menos 3 caracteres (ignorando espaços)
  const canSave = useMemo(() => razaoSocial.trim().length >= MIN_RAZAO, [razaoSocial]);

  /**
   * Processa a gravação dos dados da empresa no servidor.
   * Valida os campos, chama o serviço de perfil e atualiza o estado global do usuário.
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleSave = async () => {
    // Validação preventiva antes de tentar salvar
    if (!canSave) {
      showAlert('Erro', 'Razão Social é obrigatória e deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      setSaving(true); // Inicia o estado de loading

      // Chamada ao serviço para atualizar os dados no backend
      const updated = await profileService.updateCompanyData({
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || undefined, // Envia undefined se estiver vazio
      });

      // Atualiza o contexto de autenticação com os novos dados do usuário
      await setUser(updated);

      showAlert('Sucesso', 'Dados da empresa atualizados.');
      navigation.goBack(); // Retorna para a tela anterior após sucesso
    } catch (err: any) {
      // Exibe mensagem de erro caso a requisição falhe
      showAlert('Erro', err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false); // Finaliza o estado de loading independente do resultado
    }
  };

  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Cabeçalho da tela com botão de voltar */}
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Dados da empresa" />
      </Appbar.Header>

      {/* Área rolável que fecha o teclado ao tocar fora dos campos */}
      <Pressable style={{ flex: 1 }} onPress={handleDismissKeyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="bodyMedium" style={styles.helper}>
            Preencha os dados empresariais para validar sua conta PJ.
          </Text>

          {/* Campo para Razão Social - Obrigatório */}
          <TextInput
            label="Razão Social"
            value={razaoSocial}
            onChangeText={setRazaoSocial}
            mode="outlined"
            placeholder="Ex: Minha Empresa LTDA"
            error={!!razaoSocial && !canSave} // Mostra erro se o usuário começou a digitar mas não atingiu o mínimo
          />

          {/* Campo para Nome Fantasia - Opcional */}
          <TextInput
            label="Nome Fantasia"
            value={nomeFantasia}
            onChangeText={setNomeFantasia}
            mode="outlined"
            placeholder="Ex: Minha Loja"
          />

          {/* Botão de ação para salvar as alterações */}
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            disabled={!canSave || saving} // Desabilita se for inválido ou se estiver salvando
            loading={saving}
          >
            Salvar
          </Button>
        </ScrollView>
      </Pressable>
    </View>
  );
};

/**
 * Definições de estilos para o componente.
 */
const styles = StyleSheet.create({
  container: { flex: 1 },
  // Espaçamento interno do formulário
  content: { padding: spacing.lg, gap: spacing.md },
  // Margem inferior para o texto de ajuda
  helper: { marginBottom: spacing.sm },
  // Margem superior para o botão de salvar
  button: { marginTop: spacing.md },
});

export default EditProfileCompanyScreen;

