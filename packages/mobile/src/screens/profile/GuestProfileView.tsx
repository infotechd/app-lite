import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { openAuthModal } from '@/navigation/RootNavigation';
import { colors, spacing } from '@/styles/theme';

/**
 * Componente que renderiza a visualização da tela de perfil para usuários não autenticados (visitantes).
 * Exibe uma mensagem de convite e botões para login ou criação de conta.
 *
 * @component
 * @returns {JSX.Element} O elemento JSX representando a visão de visitante do perfil.
 */
const GuestProfileView: React.FC = () => {
  // Hook de autenticação para definir o redirecionamento após o login
  const { setPendingRedirect } = useAuth();

  /**
   * Manipula a abertura do modal de autenticação.
   * Define a rota de destino (ProfileHome) para que o usuário retorne a esta tela após autenticar.
   *
   * @param {'Login' | 'Register'} screen - A tela para a qual o usuário deve ser direcionado no modal.
   */
  const handleOpenAuth = (screen: 'Login' | 'Register') => {
    // Define para onde o app deve levar o usuário após o sucesso no login/cadastro
    setPendingRedirect({ routeName: 'ProfileHome' });
    // Abre o modal de autenticação na tela especificada
    openAuthModal({ screen });
  };

  return (
    <View style={styles.container}>
      {/* Título principal de chamada para ação */}
      <Text variant="headlineMedium" style={styles.title}>
        Entre ou crie uma conta
      </Text>
      
      {/* Descrição dos benefícios de possuir uma conta */}
      <Text variant="bodyLarge" style={styles.subtitle}>
        Salve ofertas favoritas, publique serviços e acompanhe seu perfil em um só lugar.
      </Text>

      <View style={styles.actions}>
        {/* Botão para acessar a tela de login */}
        <Button mode="contained" onPress={() => handleOpenAuth('Login')} style={styles.button}>
          Entrar
        </Button>
        
        {/* Botão para acessar a tela de registro de nova conta */}
        <Button mode="outlined" onPress={() => handleOpenAuth('Register')} style={styles.button}>
          Criar conta
        </Button>
      </View>
    </View>
  );
};

/**
 * Estilos aplicados ao componente GuestProfileView.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    marginBottom: spacing.sm,
    color: colors.text,
  },
  subtitle: {
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.xs,
  },
});

export default GuestProfileView;

