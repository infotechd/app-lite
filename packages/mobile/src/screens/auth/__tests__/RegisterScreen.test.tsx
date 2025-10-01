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

import { fireEvent, waitFor } from '@testing-library/react-native';
import { MESSAGES } from '@/constants/messages';
import { AuthService } from '@/services/authService';

describe('RegisterScreen - validation', () => {
  const setup = () => {
    const navigation = createNavMock();
    const utils = renderWithProviders(
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );
    const nome = utils.getByTestId('input-nome');
    const email = utils.getByTestId('input-email');
    const password = utils.getByTestId('input-password');
    const telefone = utils.getByTestId('input-telefone');
    const submit = utils.getByTestId('btn-registrar');
    return { ...utils, navigation, nome, email, password, telefone, submit };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows required errors when submitting empty form and prevents API call', async () => {
    const { submit, queryAllByText } = setup();

    fireEvent.press(submit);

    await waitFor(() => {
      const requiredTexts = queryAllByText(MESSAGES.VALIDATION.REQUIRED);
      expect(requiredTexts.length).toBeGreaterThanOrEqual(3);
      expect((AuthService.register as jest.Mock).mock.calls.length).toBe(0);
    });
  });

  it('validates invalid email format', async () => {
    const { nome, email, password, submit, findByText } = setup();

    fireEvent.changeText(nome, 'João');
    fireEvent.changeText(email, 'invalid');
    fireEvent.changeText(password, '123456');

    fireEvent.press(submit);

    expect(await findByText(MESSAGES.VALIDATION.EMAIL_INVALID)).toBeTruthy();
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  it('validates minimum password length', async () => {
    const { nome, email, password, submit, findByText } = setup();

    fireEvent.changeText(nome, 'Maria');
    fireEvent.changeText(email, 'maria@example.com');
    fireEvent.changeText(password, '123');

    fireEvent.press(submit);

    expect(await findByText(MESSAGES.VALIDATION.PASSWORD_MIN)).toBeTruthy();
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  it('validates telefone format when provided', async () => {
    const { nome, email, password, telefone, submit, findByText } = setup();

    fireEvent.changeText(nome, 'Pedro');
    fireEvent.changeText(email, 'pedro@example.com');
    fireEvent.changeText(password, '123456');
    fireEvent.changeText(telefone, '123');

    fireEvent.press(submit);

    expect(await findByText(MESSAGES.VALIDATION.PHONE_INVALID)).toBeTruthy();
    expect(AuthService.register).not.toHaveBeenCalled();
  });
});


describe('RegisterScreen - submit success flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const fillValidAndRender = () => {
    const navigation = createNavMock();
    const utils = renderWithProviders(
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );

    const nome = utils.getByTestId('input-nome');
    const email = utils.getByTestId('input-email');
    const password = utils.getByTestId('input-password');
    const telefone = utils.getByTestId('input-telefone');
    const submit = utils.getByTestId('btn-registrar');

    // Fill with valid values
    fireEvent.changeText(nome, 'Ana');
    fireEvent.changeText(email, 'ana@example.com');
    fireEvent.changeText(password, '123456');
    fireEvent.changeText(telefone, '(11) 99999-9999');

    return { navigation, utils, submit };
  };

  it('performs success flow on submit', async () => {
    // Arrange: mock service with deferred promise to check loading state during pending request
    let resolveRegister: (value?: any) => void = () => {};
    (AuthService.register as jest.Mock).mockImplementation(
      () => new Promise(resolve => { resolveRegister = resolve; })
    );

    const { utils, submit, navigation } = fillValidAndRender();

    // Act: submit form
    fireEvent.press(submit);

    // Assert: button is loading and disabled during submission
    expect(utils.getByTestId('btn-registrar').props.loading).toBe(true);
    expect(utils.getByTestId('btn-registrar').props.disabled).toBe(true);

    // Resolve the mocked API call
    resolveRegister({});

    // Wait UI to reflect success and button reset
    await waitFor(() => {
      expect(utils.getByText(MESSAGES.SUCCESS.REGISTER)).toBeTruthy();
      expect(utils.getByTestId('btn-registrar').props.loading).toBe(false);
      expect(utils.getByTestId('btn-registrar').props.disabled).toBe(false);
    });

    // Service called with correct payload
    expect(AuthService.register).toHaveBeenCalledTimes(1);
    expect((AuthService.register as jest.Mock).mock.calls[0][0]).toEqual({
      nome: 'Ana',
      email: 'ana@example.com',
      password: '123456',
      telefone: '(11) 99999-9999',
      tipo: 'buyer',
    });

    // After timeout, should navigate to Login
    jest.advanceTimersByTime(500);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Login'));
  });
});



describe.skip('RegisterScreen - submit error flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAndFillValid = () => {
    const navigation = createNavMock();
    const utils = renderWithProviders(
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );

    const nome = utils.getByTestId('input-nome');
    const email = utils.getByTestId('input-email');
    const password = utils.getByTestId('input-password');
    const telefone = utils.getByTestId('input-telefone');
    const submit = utils.getByTestId('btn-registrar');

    fireEvent.changeText(nome, 'Carla');
    fireEvent.changeText(email, 'carla@example.com');
    fireEvent.changeText(password, '123456');
    fireEvent.changeText(telefone, '(11) 98888-7777');

    return { navigation, utils, submit, email };
  };

  it('shows Snackbar and marks email field when service rejects with email-related message', async () => {
    const msg = 'Email já cadastrado';
    (AuthService.register as jest.Mock).mockRejectedValueOnce({ response: { data: { message: msg } } });

    const { utils, submit, email } = renderAndFillValid();

    fireEvent.press(submit);

    await waitFor(() => {
      // Snackbar shows the message
      expect(utils.getByText(msg)).toBeTruthy();
      // Email field should be in error state
      expect(email.props.error).toBe(true);
    });
  });

  it('shows Snackbar with generic error message (from e.message) when service rejects generically', async () => {
    const generic = new Error('Falhou ao registrar');
    (AuthService.register as jest.Mock).mockRejectedValueOnce(generic);

    const { utils, submit } = renderAndFillValid();

    fireEvent.press(submit);

    await waitFor(() => {
      expect(utils.getByText('Falhou ao registrar')).toBeTruthy();
    });
  });
});


// 5) Comportamento de navegação direto
// Tocar no botão “Já tenho uma conta” navega para navigation.navigate('Login') quando não está submetendo.
describe('RegisterScreen - direct navigation', () => {
  it('tapping "Já tenho uma conta" navigates to Login when not submitting', () => {
    const navigation = createNavMock();

    const { getByTestId } = renderWithProviders(
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );

    const link = getByTestId('btn-ja-tenho-conta');

    // Should not be disabled initially (not submitting)
    expect(link.props.disabled).toBe(false);

    // Pressing should navigate to Login
    fireEvent.press(link);

    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});


// 6) Seleção de tipo de usuário
// Alterar o SegmentedButtons para provider ou advertiser e verificar que o submit envia tipo atualizado.
describe('RegisterScreen - seleção de tipo de usuário', () => {
  const setupAndFillBase = () => {
    const navigation = createNavMock();
    const utils = renderWithProviders(
      <RegisterScreen navigation={navigation as any} route={{ key: 'register', name: 'Register' } as any} />
    );
    const nome = utils.getByTestId('input-nome');
    const email = utils.getByTestId('input-email');
    const password = utils.getByTestId('input-password');
    // Preenche com valores válidos
    fireEvent.changeText(nome, 'Bruno');
    fireEvent.changeText(email, 'bruno@example.com');
    fireEvent.changeText(password, '123456');
    return { navigation, utils };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('envia tipo = provider quando selecionado', async () => {
    const { utils } = setupAndFillBase();

    // Seleciona o tipo 'provider'
    const segProvider = utils.getByTestId('seg-provider');
    fireEvent.press(segProvider);

    // Submete o formulário
    fireEvent.press(utils.getByTestId('btn-registrar'));

    await waitFor(() => {
      expect(AuthService.register).toHaveBeenCalledTimes(1);
    });

    const payload = (AuthService.register as jest.Mock).mock.calls[0][0];
    expect(payload.tipo).toBe('provider');
  });

  it('envia tipo = advertiser quando selecionado', async () => {
    const { utils } = setupAndFillBase();

    // Seleciona o tipo 'advertiser'
    const segAdvertiser = utils.getByTestId('seg-advertiser');
    fireEvent.press(segAdvertiser);

    // Submete o formulário
    fireEvent.press(utils.getByTestId('btn-registrar'));

    await waitFor(() => {
      expect(AuthService.register).toHaveBeenCalledTimes(1);
    });

    const payload = (AuthService.register as jest.Mock).mock.calls[0][0];
    expect(payload.tipo).toBe('advertiser');
  });
});
