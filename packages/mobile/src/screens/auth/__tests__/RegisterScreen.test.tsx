import React from 'react';
import { render } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { Provider as PaperProvider } from 'react-native-paper';

// Basic mock for navigation prop expected by the screen
const createNavMock = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
});

// In a basic render test we don't want to hit real API/service code
jest.mock('@/services/authService', () => ({
  AuthService: { register: jest.fn(async () => ({})) },
}));

// Render helper wrapping with Paper Provider (react-native-paper)
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<PaperProvider>{ui}</PaperProvider>);
};

describe('RegisterScreen - basic render', () => {
  it('should render title, inputs and buttons', () => {
    const navigation = createNavMock();

    const { getByText, getByTestId } = renderWithProviders(
      // route is not used by the screen; provide minimal shape
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );

    // Title
    expect(getByText('Criar conta')).toBeTruthy();

    // Inputs
    expect(getByTestId('input-nome')).toBeTruthy();
    expect(getByTestId('input-email')).toBeTruthy();
    expect(getByTestId('input-password')).toBeTruthy();
    expect(getByTestId('input-telefone')).toBeTruthy();

    // Buttons
    expect(getByTestId('btn-registrar')).toBeTruthy();
    expect(getByTestId('btn-ja-tenho-conta')).toBeTruthy();
  });
});
