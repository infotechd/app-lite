import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { MESSAGES } from '@/constants/messages';
import { AuthService } from '@/services/authService';

// Mock AuthService
jest.mock('@/services/authService', () => ({
  AuthService: {
    register: jest.fn(),
  },
}));

// Mock formatPhoneNumber
jest.mock('@/utils/phoneFormatter', () => ({
  formatPhoneNumber: jest.fn((val) => val),
}));

const createNavMock = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
});

describe('RegisterScreen', () => {
  const navigation = createNavMock();
  const route = { key: 'register', name: 'Register' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render correctly with default PF fields', () => {
      const { getByTestId, queryByTestId } = render(
        <RegisterScreen navigation={navigation as any} route={route} />
      );

      expect(getByTestId('title-registrar')).toBeTruthy();
      
      // PF fields
      expect(getByTestId('input-nome')).toBeTruthy();
      expect(getByTestId('input-cpf')).toBeTruthy();

      // PJ fields should NOT be visible
      expect(queryByTestId('input-razaoSocial')).toBeNull();
      expect(queryByTestId('input-cnpj')).toBeNull();

      // Common fields
      expect(getByTestId('input-email')).toBeTruthy();
      expect(getByTestId('input-telefone')).toBeTruthy();
      expect(getByTestId('input-password')).toBeTruthy();
      expect(getByTestId('btn-registrar')).toBeTruthy();
    });

    it('should switch to PJ fields when PJ is selected', async () => {
      const { getByTestId, queryByTestId, findByTestId } = render(
        <RegisterScreen navigation={navigation as any} route={route} />
      );

      const btnPj = getByTestId('btn-pj');
      fireEvent.press(btnPj);

      // PJ fields should now be visible
      expect(await findByTestId('input-razaoSocial')).toBeTruthy();
      expect(getByTestId('input-cnpj')).toBeTruthy();

      // PF fields should NOT be visible anymore
      expect(queryByTestId('input-nome')).toBeNull();
      expect(queryByTestId('input-cpf')).toBeNull();
    });
  });

  describe('Validation', () => {
    it('shows required errors when submitting empty', async () => {
      const { getByTestId, findAllByText } = render(
        <RegisterScreen navigation={navigation as any} route={route} />
      );

      fireEvent.press(getByTestId('btn-registrar'));

      await waitFor(async () => {
        const errors = await findAllByText(MESSAGES.VALIDATION.REQUIRED);
        expect(errors.length).toBeGreaterThanOrEqual(4);
      });
      expect(AuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    it('successfully registers a PF user', async () => {
      (AuthService.register as jest.Mock).mockResolvedValueOnce({});
      jest.useFakeTimers();

      const { getByTestId } = render(
        <RegisterScreen navigation={navigation as any} route={route} />
      );

      fireEvent.changeText(getByTestId('input-nome'), 'João Silva');
      fireEvent.changeText(getByTestId('input-cpf'), '123.456.789-00');
      fireEvent.changeText(getByTestId('input-email'), 'joao@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      fireEvent.press(getByTestId('btn-registrar'));

      await waitFor(() => {
        expect(AuthService.register).toHaveBeenCalled();
      });

      jest.advanceTimersByTime(500);
      expect(navigation.replace).toHaveBeenCalledWith('Login');
      
      jest.useRealTimers();
    });
  });

  describe('Navigation', () => {
    it('navigates to Login when "Já tenho uma conta" is pressed', () => {
      const { getByTestId } = render(
        <RegisterScreen navigation={navigation as any} route={route} />
      );

      fireEvent.press(getByTestId('btn-ja-tenho-conta'));
      expect(navigation.navigate).toHaveBeenCalledWith('Login');
    });
  });
});
