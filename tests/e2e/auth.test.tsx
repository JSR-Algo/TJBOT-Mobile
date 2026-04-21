/**
 * E2E tests for Auth flow — covers all buttons in:
 * LoginScreen, SignupScreen, ForgotPasswordScreen, CoppaScreen
 *
 * Note: ErrorMessage renders as "⚠️ {message}" — use regex for text matching.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/auth/LoginScreen';
import SignupScreen from '../../src/screens/auth/SignupScreen';
import ForgotPasswordScreen from '../../src/screens/auth/ForgotPasswordScreen';
import CoppaScreen from '../../src/screens/auth/CoppaScreen';
import { mockToastShow } from '../setup';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockLogin = jest.fn();
const mockSignup = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    logout: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../src/api/auth', () => ({
  forgotPassword: jest.fn().mockResolvedValue({}),
  sendConsent: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/auth/pendingCredentials', () => ({
  pendingCredentials: {
    set: jest.fn(),
    get: jest.fn().mockReturnValue({ email: 'test@test.com', password: 'password123' }),
    clear: jest.fn(),
  },
}));

// ─── LoginScreen ──────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all interactive elements', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Forgot password?')).toBeTruthy();
    expect(getByText('Sign up')).toBeTruthy();
    expect(getByPlaceholderText('parent@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Your password')).toBeTruthy();
  });

  it('shows error when fields are empty and Sign In is pressed', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText(/Please enter your email and password/)).toBeTruthy();
    });
  });

  it('calls login with email and password', async () => {
    mockLogin.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('parent@email.com'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows a toast on login network failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Network error'));
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('parent@email.com'), 'wrong@test.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'wrongpass');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith({
        severity: 'error',
        text: 'Network error. Please try again.',
      });
    });
  });

  it('navigates to ForgotPassword when "Forgot password?" is pressed', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Forgot password?'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to Signup when "Sign up" is pressed', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign up'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });
});

// ─── SignupScreen ─────────────────────────────────────────────────────────────

describe('SignupScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all interactive elements', () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Sign in')).toBeTruthy();
    expect(getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(getByPlaceholderText('jane@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Min. 8 characters')).toBeTruthy();
    expect(getByPlaceholderText('Repeat password')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = render(<SignupScreen />);
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(getByText(/Please fill in all fields/)).toBeTruthy();
    });
  });

  it('shows error when passwords do not match', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Jane Smith'), 'Jane');
    fireEvent.changeText(getByPlaceholderText('jane@email.com'), 'jane@test.com');
    fireEvent.changeText(getByPlaceholderText('Min. 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'different123');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(getByText(/Passwords do not match/)).toBeTruthy();
    });
  });

  it('shows error when password is too short', async () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Jane Smith'), 'Jane');
    fireEvent.changeText(getByPlaceholderText('jane@email.com'), 'jane@test.com');
    fireEvent.changeText(getByPlaceholderText('Min. 8 characters'), 'short');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'short');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(getByText(/Password must be at least 8 characters/)).toBeTruthy();
    });
  });

  it('calls signup and navigates to Coppa on success', async () => {
    mockSignup.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Jane Smith'), 'Jane Smith');
    fireEvent.changeText(getByPlaceholderText('jane@email.com'), 'jane@test.com');
    fireEvent.changeText(getByPlaceholderText('Min. 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'password123');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('Jane Smith', 'jane@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('Coppa');
    });
  });

  it('shows a toast on signup server failure', async () => {
    mockSignup.mockRejectedValueOnce({ status: 500 });
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);
    fireEvent.changeText(getByPlaceholderText('Jane Smith'), 'Jane Smith');
    fireEvent.changeText(getByPlaceholderText('jane@email.com'), 'jane@test.com');
    fireEvent.changeText(getByPlaceholderText('Min. 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repeat password'), 'password123');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith({
        severity: 'error',
        text: 'Server error. Please try again.',
      });
    });
  });

  it('navigates back when "Sign in" is pressed', () => {
    const { getByText } = render(<SignupScreen />);
    fireEvent.press(getByText('Sign in'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ─── ForgotPasswordScreen ─────────────────────────────────────────────────────

describe('ForgotPasswordScreen', () => {
  const authApi = require('../../src/api/auth');

  beforeEach(() => jest.clearAllMocks());

  it('renders Send Reset Link button', () => {
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);
    expect(getByText('Send Reset Link')).toBeTruthy();
    expect(getByPlaceholderText('your@email.com')).toBeTruthy();
  });

  it('shows error when email is empty', async () => {
    const { getByText } = render(<ForgotPasswordScreen />);
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(getByText(/Please enter your email/)).toBeTruthy();
    });
  });

  it('calls forgotPassword and shows success state', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@test.com');
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('test@test.com');
      expect(getByText('Check your inbox')).toBeTruthy();
      expect(getByText('Back to Login')).toBeTruthy();
    });
  });

  it('navigates to Login when "Back to Login" is pressed', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@test.com');
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => expect(getByText('Back to Login')).toBeTruthy());
    fireEvent.press(getByText('Back to Login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('shows a toast on server failure', async () => {
    authApi.forgotPassword.mockRejectedValueOnce({ status: 500 });
    const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@test.com');
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith({
        severity: 'error',
        text: 'Server error. Please try again.',
      });
    });
  });
});

// ─── CoppaScreen ──────────────────────────────────────────────────────────────

describe('CoppaScreen', () => {
  const authApi = require('../../src/api/auth');

  beforeEach(() => jest.clearAllMocks());

  it('renders the consent button', () => {
    const { getByText } = render(<CoppaScreen />);
    expect(getByText('I Consent as Parent / Guardian')).toBeTruthy();
  });

  it('calls sendConsent and login on button press', async () => {
    authApi.sendConsent.mockResolvedValueOnce({});
    mockLogin.mockResolvedValueOnce({});
    const { getByText } = render(<CoppaScreen />);
    fireEvent.press(getByText('I Consent as Parent / Guardian'));
    await waitFor(() => {
      expect(authApi.sendConsent).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows error when sendConsent fails', async () => {
    authApi.sendConsent.mockRejectedValueOnce(new Error('Server error'));
    const { getByText } = render(<CoppaScreen />);
    fireEvent.press(getByText('I Consent as Parent / Guardian'));
    await waitFor(() => {
      expect(getByText(/Could not record consent/)).toBeTruthy();
    });
  });
});
