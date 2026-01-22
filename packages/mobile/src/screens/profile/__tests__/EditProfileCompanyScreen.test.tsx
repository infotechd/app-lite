import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileCompanyScreen from '@/screens/profile/EditProfileCompanyScreen';
import { AuthContext } from '@/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, Keyboard } from 'react-native';
import * as profileService from '@/services/profileService';
import { showAlert } from '@/utils/alert';

// Mock do showAlert
jest.mock('@/utils/alert', () => ({
  showAlert: jest.fn(),
}));

// Mock do profileService
jest.mock('@/services/profileService', () => ({
  updateCompanyData: jest.fn(),
}));

const mockUser = {
  id: '1',
  razaoSocial: 'Minha Empresa',
  nomeFantasia: 'Meu Nome Fantasia',
};

const renderWithAuth = (user = mockUser, setUser = jest.fn()) => {
  return render(
    <NavigationContainer>
      <AuthContext.Provider value={{ user, setUser, isAuthenticated: true }}>
        <EditProfileCompanyScreen />
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

describe('EditProfileCompanyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar os dados da empresa corretamente', () => {
    renderWithAuth();
    expect(screen.getByDisplayValue('Minha Empresa')).toBeTruthy();
    expect(screen.getByDisplayValue('Meu Nome Fantasia')).toBeTruthy();
  });

  it('deve validar Razão Social (obrigatória e mínimo 3 caracteres)', () => {
    renderWithAuth();
    const input = screen.getByLabelText('Razão Social');
    
    fireEvent.changeText(input, '');
    expect(screen.getByText('Salvar').props.accessibilityState.disabled).toBe(true);
    
    fireEvent.changeText(input, 'Ab');
    expect(screen.getByText('Salvar').props.accessibilityState.disabled).toBe(true);
    
    fireEvent.changeText(input, 'Abc');
    expect(screen.getByText('Salvar').props.accessibilityState.disabled).toBe(false);
  });

  it('deve salvar os dados da empresa com sucesso', async () => {
    const setUserMock = jest.fn();
    (profileService.updateCompanyData as jest.Mock).mockResolvedValue({ ...mockUser, razaoSocial: 'Nova Razão' });
    
    renderWithAuth(mockUser, setUserMock);
    
    fireEvent.changeText(screen.getByLabelText('Razão Social'), 'Nova Razão');
    fireEvent.press(screen.getByText('Salvar'));
    
    await waitFor(() => {
      expect(profileService.updateCompanyData).toHaveBeenCalledWith({
        razaoSocial: 'Nova Razão',
        nomeFantasia: 'Meu Nome Fantasia',
      });
      expect(setUserMock).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith('Sucesso', expect.any(String));
    });
  });

  it('deve chamar Keyboard.dismiss ao pressionar o container se não for Web', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    Platform.OS = 'ios';
    renderWithAuth();
    
    const pressable = screen.root.findByProps({ style: { flex: 1 } });
    fireEvent.press(pressable);
    
    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });
});
