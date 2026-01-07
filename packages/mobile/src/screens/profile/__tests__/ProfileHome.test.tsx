import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileHome from '@/screens/profile/ProfileHome';
import { AuthContext } from '@/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';

/**
 * Utilitário para renderizar o componente ProfileHome envolvido pelos provedores necessários (Navegação e Autenticação).
 * 
 * @param {any} contextValue - O valor a ser injetado no AuthContext para simular o estado do usuário.
 * @returns O resultado da renderização para uso nos testes.
 */
const renderWithAuth = (contextValue: any) => {
  return render(
    <NavigationContainer>
      <AuthContext.Provider value={contextValue}>
        <ProfileHome />
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

/**
 * Suíte de testes para a tela principal de Perfil (ProfileHome).
 */
describe('ProfileHome', () => {
  /**
   * Verifica se a tela exibe a mensagem de convite para visitantes
   * quando o usuário não está autenticado.
   */
  it('renders guest view when unauthenticated', () => {
    renderWithAuth({ isAuthenticated: false, user: null });
    expect(screen.getByText(/Entre ou crie uma conta/i)).toBeTruthy();
  });

  /**
   * Verifica se a tela exibe o conteúdo do perfil do usuário
   * quando ele está devidamente autenticado.
   */
  it('renders user view when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, user: { id: '1', nome: 'John' } });
    expect(screen.getByText(/Perfil/i)).toBeTruthy();
  });

  /**
   * Verifica se ao clicar nos botões de autenticação na visão de visitante,
   * o sistema define corretamente o redirecionamento pendente e abre o modal.
   */
  it('guest view buttons open auth modal with pending redirect', () => {
    const setPendingRedirect = jest.fn();
    // Obtém a referência mockada da função de abertura do modal
    const openAuthModal = require('@/navigation/RootNavigation').openAuthModal as jest.Mock;
    openAuthModal.mockClear();

    renderWithAuth({ isAuthenticated: false, user: null, setPendingRedirect });

    // Aciona o evento de pressionar o botão "Entrar"
    fireEvent.press(screen.getByText(/Entrar/i));
    
    // Valida se o redirecionamento para ProfileHome foi registrado
    expect(setPendingRedirect).toHaveBeenCalledWith({ routeName: 'ProfileHome' });
    
    // Valida se a tela de Login foi aberta no modal
    expect(openAuthModal).toHaveBeenCalledWith({ screen: 'Login' });
  });
});

