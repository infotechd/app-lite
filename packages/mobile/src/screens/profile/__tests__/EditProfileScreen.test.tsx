import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import { AuthContext } from '@/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, Keyboard } from 'react-native';

// Mock do Keyboard.dismiss
Keyboard.dismiss = jest.fn();
import * as profileService from '@/services/profileService';
import { showAlert } from '@/utils/alert';

// Mock do showAlert
jest.mock('@/utils/alert', () => ({
  showAlert: jest.fn(),
}));

// Mocks do Expo
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));
jest.mock('expo-asset', () => ({
  Asset: { fromModule: jest.fn() },
}));

// Mock do profileService
jest.mock('@/services/profileService', () => ({
  updateName: jest.fn(),
  updatePhone: jest.fn(),
  updateLocation: jest.fn(),
  updateEmail: jest.fn(),
  confirmEmailChange: jest.fn(),
}));

// Mock do AvatarEditor para simplificar e evitar erros de componentes internos
jest.mock('@/components/profile/AvatarEditor', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="avatar-editor" />;
});

// Mock do react-native-paper para evitar erros de componentes não definidos
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput, Button, TouchableOpacity } = require('react-native');
  
  const MockAppbar = ({ children }: any) => <View>{children}</View>;
  MockAppbar.Header = ({ children }: any) => <View>{children}</View>;
  MockAppbar.BackAction = (props: any) => <TouchableOpacity {...props}><Text>Back</Text></TouchableOpacity>;
  MockAppbar.Content = ({ title }: any) => <Text>{title}</Text>;
  MockAppbar.Action = (props: any) => <TouchableOpacity {...props} />;

  const MockTextInput = (props: any) => (
    <View>
      <Text>{props.label}</Text>
      <TextInput {...props} />
    </View>
  );
  MockTextInput.Icon = ({ icon }: any) => <Text>{icon}</Text>;

  const MockAvatar = ({ children }: any) => <View>{children}</View>;
  MockAvatar.Text = (props: any) => <View><Text>{props.label}</Text></View>;
  MockAvatar.Image = (props: any) => <View />;

  const MockPortal = ({ children }: any) => <View>{children}</View>;
  const MockDialog = ({ children }: any) => <View>{children}</View>;
  MockDialog.Title = ({ children }: any) => <Text>{children}</Text>;
  MockDialog.Content = ({ children }: any) => <View>{children}</View>;
  MockDialog.Actions = ({ children }: any) => <View>{children}</View>;

  return {
    Appbar: MockAppbar,
    TextInput: MockTextInput,
    Avatar: MockAvatar,
    Button: (props: any) => <TouchableOpacity {...props}><Text>{props.children}</Text></TouchableOpacity>,
    Text: (props: any) => <Text {...props}>{props.children}</Text>,
    ActivityIndicator: () => <View />,
    Portal: MockPortal,
    Dialog: MockDialog,
    Provider: ({ children }: any) => children,
  };
});

const mockUser = {
  id: '1',
  nome: 'Usuário Teste',
  email: 'teste@exemplo.com',
  telefone: '11999999999',
  localizacao: {
    cidade: 'São Paulo',
    estado: 'SP',
  },
};

const renderWithAuth = (user = mockUser, setUser = jest.fn()) => {
  return render(
    <NavigationContainer>
      <AuthContext.Provider value={{ user, setUser, isAuthenticated: true }}>
        <EditProfileScreen />
      </AuthContext.Provider>
    </NavigationContainer>
  );
};

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar os dados iniciais do usuário corretamente', () => {
    renderWithAuth();
    
    expect(screen.getByDisplayValue('Usuário Teste')).toBeTruthy();
    expect(screen.getByDisplayValue('11999999999')).toBeTruthy();
    expect(screen.getByDisplayValue('São Paulo')).toBeTruthy();
    expect(screen.getByDisplayValue('SP')).toBeTruthy();
    expect(screen.getByDisplayValue('teste@exemplo.com')).toBeTruthy();
  });

  it('deve habilitar o botão salvar apenas quando houver alterações válidas', async () => {
    renderWithAuth();
    
    // Inicialmente desabilitado (sem mudanças)
    expect(screen.getByText('Salvar').parent.props.accessibilityState.disabled).toBe(true);

    // Altera o nome para algo válido
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Novo Nome');
    expect(screen.getByText('Salvar').parent.props.accessibilityState.disabled).toBe(false);

    // Altera para um nome inválido (curto)
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Ab');
    expect(screen.getByText('Salvar').parent.props.accessibilityState.disabled).toBe(true);
  });

  it('deve chamar Keyboard.dismiss ao pressionar o container se não for Web', () => {
    // Simula plataforma iOS
    Platform.OS = 'ios';
    renderWithAuth();
    
    const pressable = screen.root.findByProps({ style: { flex: 1 } });
    fireEvent.press(pressable);
    
    expect(Keyboard.dismiss).toHaveBeenCalled();
  });

  it('NÃO deve chamar Keyboard.dismiss ao pressionar o container se for Web', () => {
    // Simula plataforma Web
    Platform.OS = 'web';
    renderWithAuth();
    
    const pressable = screen.root.findByProps({ style: { flex: 1 } });
    fireEvent.press(pressable);
    
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
  });

  it('deve salvar as alterações de nome com sucesso', async () => {
    const setUserMock = jest.fn();
    (profileService.updateName as jest.Mock).mockResolvedValue({ ...mockUser, nome: 'Novo Nome' });
    
    renderWithAuth(mockUser, setUserMock);
    
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Novo Nome');
    fireEvent.press(screen.getByText('Salvar'));
    
    await waitFor(() => {
      expect(profileService.updateName).toHaveBeenCalledWith('Novo Nome');
      expect(setUserMock).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith('Sucesso', expect.any(String));
    });
  });

  it('deve validar o formato do e-mail', () => {
    renderWithAuth();
    const emailInput = screen.getByLabelText('E-mail');
    
    fireEvent.changeText(emailInput, 'email-invalido');
    // Verifica se o input de e-mail está em estado de erro
    // No react-native-paper, o erro é passado via prop 'error'
    expect(emailInput.props.error).toBe(true);
    
    fireEvent.changeText(emailInput, 'valido@email.com');
    expect(emailInput.props.error).toBe(false);
  });
});
