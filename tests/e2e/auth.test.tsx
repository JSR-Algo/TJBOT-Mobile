/**
 * Unit tests for production auth feature flow.
 *
 * Covers:
 *   - LoginScreen: signup/login mode toggle, inline error handling, password UX,
 *     forgot-password flow, USER_EXISTS auto-switch, field-level error highlighting
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as authApi from '@/services/api/auth';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockForgotPassword = jest.spyOn(authApi, 'forgotPassword');

const mockNavProp = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: mockGoBack,
  setParams: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: () => true,
  canGoBack: () => true,
  getId: () => 'TestNav',
  getParent: () => undefined,
  getState: () => ({} as never),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
} as any;

const mockRoute = { key: 'test', name: 'TestRoute', params: undefined };

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    logout: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

// ─── LoginScreen ──────────────────────────────────────────────────────────────

describe('LoginScreen (auth feature)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders signup mode by default with email + password inputs', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText('Create your account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Create account')).toBeTruthy();
    expect(getByLabelText('Sign up mode').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Log in mode').props.accessibilityState).toEqual({ selected: false });
  });

  it('switches to login mode when "Log in" tab pressed', () => {
    const { getAllByText, getByText, getByLabelText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getAllByText('Log in').length).toBeGreaterThanOrEqual(2);
    expect(getByLabelText('Sign up mode').props.accessibilityState).toEqual({ selected: false });
    expect(getByLabelText('Log in mode').props.accessibilityState).toEqual({ selected: true });
  });

  it('does not render placeholder social auth buttons', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(() => getByText('Continue with Google')).toThrow();
    expect(() => getByText('Continue with Apple')).toThrow();
  });

  it('calls login with email + password in login mode', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getAllByText('Log in')[1]);
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('parent@test.com', 'password123');
    });
  });

  it('lets the root auth gate switch branches on login success (no replace call)', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getAllByText('Log in')[1]);
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('shows inline error on login failure (no navigation)', async () => {
    mockLogin.mockRejectedValueOnce(new Error('bad credentials'));
    const { getAllByText, getByPlaceholderText, findByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
    fireEvent.press(getAllByText('Log in')[1]);
    const alert = await findByRole('alert');
    expect(alert).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows validation feedback and does not submit empty credentials', () => {
    const { getByText, getByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Create account'));
    expect(getByRole('alert')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls signup(email, email, password) when in signup mode', async () => {
    mockSignup.mockResolvedValueOnce(undefined);
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'NewPass1!');
    fireEvent.changeText(getByPlaceholderText('Confirm password'), 'NewPass1!');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('new@test.com', 'new@test.com', 'NewPass1!');
    });
  });

  it('shows PasswordChecklist rule text in signup mode', () => {
    const { getAllByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    const ruleTexts = ['At least 8 characters', 'One uppercase letter', 'One number', 'One special character (!@#$%^&*)'];
    for (const rule of ruleTexts) {
      expect(getAllByText(rule).length).toBeGreaterThan(0);
    }
  });

  it('does not show PasswordChecklist in login mode', () => {
    const { queryByText, getAllByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    expect(queryByText('At least 8 characters')).toBeNull();
  });

  it('shows show/hide password toggle and changes secureTextEntry state', () => {
    const { getAllByLabelText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    const passwordInput = getByPlaceholderText('Password');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    fireEvent.press(getAllByLabelText('Show password')[0]);
    expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(false);
    fireEvent.press(getAllByLabelText('Hide password')[0]);
    expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
  });

  it('shows confirm password field in signup mode and validates mismatch', async () => {
    const { getByPlaceholderText, findByRole, getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'NewPass1!');
    fireEvent.changeText(getByPlaceholderText('Confirm password'), 'DifferentPass1!');
    fireEvent.press(getByText('Create account'));
    const alert = await findByRole('alert');
    expect(alert.props.children).toContain('Passwords do not match');
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('clears all errors when switching mode tab', () => {
    const { getAllByText, getByText, queryByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Create account'));
    expect(queryByRole('alert')).toBeTruthy();
    fireEvent.press(getAllByText('Log in')[0]);
    expect(queryByRole('alert')).toBeNull();
  });

  it('shows email field-level error when email is missing', () => {
    const { getAllByText, getByPlaceholderText, getByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Password'), 'Pass1!');
    fireEvent.press(getAllByText('Log in')[1]);
    expect(getByRole('alert')).toBeTruthy();
  });

  it('shows Forgot password link in login mode only', () => {
    const { getAllByText, queryByLabelText, getByLabelText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(queryByLabelText('Forgot password')).toBeNull();
    fireEvent.press(getAllByText('Log in')[0]);
    expect(getByLabelText('Forgot password')).toBeTruthy();
  });

  it('switches to forgot password inline reset flow when link pressed', () => {
    const { getAllByText, getByLabelText, getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.press(getByLabelText('Forgot password'));
    expect(getByText('Send reset email')).toBeTruthy();
    expect(getByLabelText('Back to log in')).toBeTruthy();
  });

  it('calls forgotPassword API and shows success message in inline reset flow', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined);
    const { getAllByText, getByLabelText, getByPlaceholderText, findByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.press(getByLabelText('Forgot password'));
    fireEvent.press(await findByText('Send reset email'));
    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('parent@test.com');
    });
    expect(await findByText('Password reset email sent.')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('auto-switches to login tab and shows error on USER_EXISTS', async () => {
    mockSignup.mockRejectedValueOnce({ code: 'USER_EXISTS', message: 'An account with this email already exists.' });
    const { getByText, getByPlaceholderText, getByLabelText, findByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'existing@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'NewPass1!');
    fireEvent.changeText(getByPlaceholderText('Confirm password'), 'NewPass1!');
    fireEvent.press(getByText('Create account'));
    await findByRole('alert');
    expect(getByLabelText('Log in mode').props.accessibilityState).toEqual({ selected: true });
    expect(getByPlaceholderText('Email').props.value).toBe('existing@test.com');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('auto-switches to login tab on ACCOUNT_ALREADY_EXISTS error', async () => {
    mockSignup.mockRejectedValueOnce({ code: 'ACCOUNT_ALREADY_EXISTS', message: 'An account with this email already exists.' });
    const { getByText, getByPlaceholderText, getByLabelText, findByRole } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'dupe@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'NewPass1!');
    fireEvent.changeText(getByPlaceholderText('Confirm password'), 'NewPass1!');
    fireEvent.press(getByText('Create account'));
    await findByRole('alert');
    expect(getByLabelText('Log in mode').props.accessibilityState).toEqual({ selected: true });
  });
});
