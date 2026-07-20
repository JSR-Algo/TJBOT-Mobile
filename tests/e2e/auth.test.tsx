/**
 * Unit tests for tjbot-design auth flow (rewritten from .pr5-skip for PR5 retired UI).
 *
 * Covers:
 *   - LoginScreen: signup/login mode toggle, social buttons, useAuth wiring, success/failure navigation
 *   - LoginErrorScreen: Try again + Reset password navigation
 *   - ChildProfileScreen: buddy + level selection, Save navigation
 *
 * Production parent-setup screens (Signup/ForgotPassword/Coppa/CoppaConsent/...)
 * were retired in PR5 per user directive; corresponding tests dropped.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';
import LoginErrorScreen from '../../src/features/auth/screens/LoginErrorScreen';
import ChildProfileScreen from '../../src/features/auth/screens/ChildProfileScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockLogin = jest.fn();
const mockSignup = jest.fn();

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe('LoginScreen (tjbot-design feature)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders signup mode by default with email + password inputs', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText('Create your account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Create account')).toBeTruthy();
  });

  it('switches to login mode when "Log in" tab pressed', () => {
    const { getAllByText, getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]); // only one "Log in" exists pre-press (tab)
    expect(getByText('Welcome back')).toBeTruthy();
    // After mode switch button label becomes "Log in" too → 2 instances
    expect(getAllByText('Log in').length).toBeGreaterThanOrEqual(2);
  });

  it('renders Google + Apple social buttons', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Apple')).toBeTruthy();
  });

  it('navigates to ChildProfileScreen when Google button pressed', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Continue with Google'));
    expect(mockNavigate).toHaveBeenCalledWith('ChildProfileScreen');
  });

  it('navigates to ChildProfileScreen when Apple button pressed', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Continue with Apple'));
    expect(mockNavigate).toHaveBeenCalledWith('ChildProfileScreen');
  });

  it('calls login with email + password in login mode', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    // [0] = tab label, [1] = submit button (tjtjboth say "Log in")
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getAllByText('Log in')[1]);
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('parent@test.com', 'password123');
    });
  });

  it('replaces to HomeHubScreen on login success', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getAllByText('Log in')[1]);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('HomeHubScreen');
    });
  });

  it('navigates to LoginErrorScreen on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('bad credentials'));
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getAllByText('Log in')[0]);
    fireEvent.changeText(getByPlaceholderText('Email'), 'parent@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
    fireEvent.press(getAllByText('Log in')[1]);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('LoginErrorScreen');
    });
  });

  it('calls signup(email, email, password) when in signup mode', async () => {
    mockSignup.mockResolvedValueOnce(undefined);
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'newpass123');
    fireEvent.press(getByText('Create account'));
    await waitFor(() => {
      // tjbot-design has no name input — signup called with email twice
      expect(mockSignup).toHaveBeenCalledWith('new@test.com', 'new@test.com', 'newpass123');
    });
  });
});

// ─── LoginErrorScreen ─────────────────────────────────────────────────────────

describe('LoginErrorScreen (tjbot-design feature)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders error heading + sub-text', () => {
    const { getByText } = render(
      <LoginErrorScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText("We couldn't sign you in")).toBeTruthy();
    expect(getByText(/didn't match/)).toBeTruthy();
    expect(getByText('Email or password is incorrect.')).toBeTruthy();
  });

  it('navigates to ChildProfileScreen when Try again pressed', () => {
    const { getByText } = render(
      <LoginErrorScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Try again'));
    expect(mockNavigate).toHaveBeenCalledWith('ChildProfileScreen');
  });

  it('navigates to LoginScreen when Reset password pressed', () => {
    const { getByText } = render(
      <LoginErrorScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Reset password'));
    expect(mockNavigate).toHaveBeenCalledWith('LoginScreen');
  });
});

// ─── ChildProfileScreen ───────────────────────────────────────────────────────

describe('ChildProfileScreen (tjbot-design feature)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders heading + buddy section + level section', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText('Pick a buddy and a starting level')).toBeTruthy();
    expect(getByText('BUDDY')).toBeTruthy();
    expect(getByText('STARTING LEVEL')).toBeTruthy();
  });

  it('renders all 8 buddy emojis', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    ['🐼', '🐱', '🦊', '🐰', '🐸', '🦁', '🦄', '🐶'].forEach(emoji => {
      expect(getByText(emoji)).toBeTruthy();
    });
  });

  it('renders all 3 starting level labels', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText('Just starting')).toBeTruthy();
    expect(getByText('Knows some words')).toBeTruthy();
    expect(getByText('Speaks a bit')).toBeTruthy();
  });

  it('shows default panda buddy greeting', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    expect(getByText(/Panda friend/)).toBeTruthy();
  });

  it('updates greeting when different buddy selected', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('🦊'));
    expect(getByText(/Fox friend/)).toBeTruthy();
  });

  it('navigates to IntroListenScreen when Save pressed', () => {
    const { getByText } = render(
      <ChildProfileScreen navigation={mockNavProp} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Save and meet Rotjtjbot'));
    expect(mockNavigate).toHaveBeenCalledWith('IntroListenScreen');
  });
});
