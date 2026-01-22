import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileDocumentScreen from '@/screens/profile/EditProfileDocumentScreen';
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
  updateDocuments: jest.fn(),
}));

// Mock do useRoute para passar os parâmetros CPF/CNPJ
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({
      params: { type: 'CPF' },
    }),
  };
});

// Mock do utils/cpf
jest.mock('@/utils/cpf', () => ({
  validateCPF: jest.fn((cpf) => cpf.length === 11),
}));

const mockUser = {
  id: '1',
  cpf: '12345678901',
  cnpj: '12345678000199',
};

const renderWithAuth = (user = mockUser, params = { type: 'CPF' }, setUser = jest.fn()) => {
  const { useRoute } = require('@react-navigation/native');
  (useRoute as jest.Mock).mockReturnValue({ params });

  return render(
    <NavigationContainer>
      <AuthContext.Provider value={{ user, setUser, isAuthenticated: true }}>
        <EditProfileDocumentScreen />
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

describe('EditProfileDocumentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o CPF corretamente', () => {
    renderWithAuth(mockUser, { type: 'CPF' });
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
    expect(screen.getByLabelText('CPF')).toBeTruthy();
  });

  it('deve renderizar o CNPJ corretamente', () => {
    renderWithAuth(mockUser, { type: 'CNPJ' });
    expect(screen.getByDisplayValue('12345678000199')).toBeTruthy();
    expect(screen.getByLabelText('CNPJ')).toBeTruthy();
  });

  it('deve validar CPF (inválido)', () => {
    renderWithAuth(mockUser, { type: 'CPF' });
    const input = screen.getByLabelText('CPF');
    
    // CPF com menos de 11 dígitos
    fireEvent.changeText(input, '123');
    expect(input.props.error).toBe(true);
    
    // Botão deve estar desabilitado
    const saveButton = screen.getByText('Salvar');
    expect(saveButton.props.accessibilityState.disabled).toBe(true);
  });

  it('deve salvar CPF com sucesso quando válido', async () => {
    const setUserMock = jest.fn();
    (profileService.updateDocuments as jest.Mock).mockResolvedValue({ ...mockUser, cpf: '11122233344' });
    
    renderWithAuth(mockUser, { type: 'CPF' }, setUserMock);
    
    const input = screen.getByLabelText('CPF');
    fireEvent.changeText(input, '111.222.333-44');
    
    const saveButton = screen.getByText('Salvar');
    expect(saveButton.props.accessibilityState.disabled).toBe(false);
    
    fireEvent.press(saveButton);
    
    await waitFor(() => {
      expect(profileService.updateDocuments).toHaveBeenCalledWith({ cpf: '11122233344' });
      expect(setUserMock).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith('Sucesso', expect.stringContaining('CPF atualizado'));
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
