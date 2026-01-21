import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, Keyboard } from 'react-native';

import { showAlert } from '@/utils/alert';
import { Appbar, Button, Text, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';
import { validateCPF } from '@/utils/cpf';
import { spacing } from '@/styles/theme';

interface RouteParams {
  type: 'CPF' | 'CNPJ';
}

/**
 * Tela para edição de documentos do perfil (CPF ou CNPJ).
 * Permite que o usuário atualize seus dados de identificação com validação.
 * 
 * Correção aplicada: O TouchableWithoutFeedback foi substituído por Pressable
 * com verificação de plataforma para não interferir nos inputs na versão Web.
 * 
 * @returns Componente React que renderiza a tela de edição de documento.
 */
const EditProfileDocumentScreen: React.FC = () => {
  // Hooks de navegação e rota para acessar parâmetros e controlar o fluxo de telas
  const navigation = useNavigation();
  const route = useRoute();
  
  // Contexto de autenticação para obter e atualizar dados do usuário logado
  const { user, setUser } = useAuth();
  
  // Extração do tipo de documento (CPF ou CNPJ) dos parâmetros da rota
  const { type } = route.params as RouteParams;

  // Define o valor inicial baseado no tipo de documento e nos dados atuais do usuário
  const initial = type === 'CPF' ? user?.cpf ?? '' : user?.cnpj ?? '';
  
  // Estados locais para controlar o valor do input e o status de carregamento/salvamento
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  // Textos dinâmicos para labels e placeholders dependendo do tipo (CPF/CNPJ)
  const label = type === 'CPF' ? 'CPF' : 'CNPJ';
  const placeholder = type === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00';

  // Memoiza o valor limpo (apenas dígitos) para evitar recomputações desnecessárias
  const cleanValue = useMemo(() => (value || '').replace(/\D/g, ''), [value]);
  
  // Validação em tempo real do documento informado
  const isValid = useMemo(() => {
    if (!cleanValue) return false;
    if (type === 'CPF') return validateCPF(cleanValue);
    // Para CNPJ, valida apenas o tamanho (14 dígitos) por enquanto
    return cleanValue.length === 14;
  }, [cleanValue, type]);

  /**
   * Handler para dispensar o teclado apenas em plataformas nativas.
   * Na Web, o Keyboard.dismiss() pode interferir no foco dos inputs.
   */
  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

  /**
   * Processa a ação de salvar as alterações do documento.
   * Valida o campo, envia os dados para o serviço de perfil e atualiza o contexto global.
   * 
   * @async
   * @returns {Promise<void>} Uma promessa que resolve quando a operação é concluída.
   */
  const handleSave = async () => {
    // Impede o salvamento se o valor for inválido
    if (!isValid) {
      showAlert('Erro', `${label} inválido.`);
      return;
    }
    try {
      setSaving(true); // Ativa o estado de carregamento no botão
      
      // Prepara o corpo da requisição baseado no tipo de documento
      const payload = type === 'CPF' ? { cpf: cleanValue } : { cnpj: cleanValue };
      
      // Chama o serviço para atualizar os documentos no backend
      const updated = await profileService.updateDocuments(payload);
      
      // Atualiza os dados do usuário no contexto global da aplicação
      await setUser(updated);
      
      showAlert('Sucesso', `${label} atualizado com sucesso.`);
      
      // Retorna para a tela anterior após o sucesso
      navigation.goBack();
    } catch (err: any) {
      // Exibe mensagem de erro amigável em caso de falha na requisição
      showAlert('Erro', err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false); // Desativa o estado de carregamento independente do resultado
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra superior com ação de voltar e título dinâmico */}
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`Editar ${label}`} />
      </Appbar.Header>

      <Pressable style={styles.pressableContainer} onPress={handleDismissKeyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="bodyMedium" style={styles.helper}>
            Informe seu {label} com  {type === 'CPF' ? '11' : '14'} dígitos.
          </Text>
          <TextInput
            label={label}
            value={value}
            onChangeText={setValue}
            mode="outlined"
            keyboardType="numeric"
            placeholder={placeholder}
            // Máscara visual: CPF tem 14 caracteres (000.000.000-00), CNPJ tem 18 (00.000.000/0000-00)
            maxLength={type === 'CPF' ? 14 : 18}
            error={!!value && !isValid} // Exibe estado de erro se houver valor e for inválido
          />
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            disabled={!isValid || saving} // Desabilita se for inválido ou estiver salvando
            loading={saving}
          >
            Salvar
          </Button>
        </ScrollView>
      </Pressable>
    </View>
  );
};

// Definição dos estilos da tela utilizando o tema de espaçamento centralizado
const styles = StyleSheet.create({
  container: { flex: 1 },
  pressableContainer: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  helper: { marginBottom: spacing.sm },
  button: { marginTop: spacing.md },
});

export default EditProfileDocumentScreen;
