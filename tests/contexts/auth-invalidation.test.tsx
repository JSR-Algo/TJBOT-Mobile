import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import type { User } from '../../src/types';

let mockAuthInvalidatedHandler: (() => void) | null = null;
const mockSetAuthInvalidatedHandler = jest.fn((handler: (() => void) | null) => {
  mockAuthInvalidatedHandler = handler;
});

const mockClearTokens = jest.fn<Promise<void>, []>(async () => undefined);
const mockDeleteSecureItem = jest.fn<Promise<void>, [string]>(async () => undefined);
const mockGetAccessToken = jest.fn<Promise<string | null>, []>(async () => 'stored-access');
const mockGetSecureJson = jest.fn<Promise<User | null>, [string]>(async () => ({
  id: 'user-1',
  email: 'parent@example.test',
  name: 'Parent',
}));
const mockSetSecureJson = jest.fn<Promise<void>, [string, unknown]>(async () => undefined);

const mockGetAccountSummary = jest.fn<Promise<User>, []>(async () => {
  throw new Error('Network Error');
});

const mockLogin = jest.fn<Promise<{ user?: User }>, [string, string]>();
const mockClearLocalPairedDevice = jest.fn<Promise<void>, []>(async () => undefined);
const mockClearRewardSeenQueue = jest.fn<Promise<void>, [string | null]>(async () => undefined);
const mockSetRewardQueueScope = jest.fn<void, [string | null, string | null]>();
const mockReplayRewardSeenQueue = jest.fn<Promise<void>, []>(async () => undefined);
const mockRemoveQueries = jest.fn();

jest.mock('../../src/services/http/client', () => ({
  setAuthInvalidatedHandler: (handler: (() => void) | null) => mockSetAuthInvalidatedHandler(handler),
}));

jest.mock('../../src/services/http/tokens', () => ({
  clearTokens: () => mockClearTokens(),
  deleteSecureItem: (key: string) => mockDeleteSecureItem(key),
  getAccessToken: () => mockGetAccessToken(),
  getSecureJson: (key: string) => mockGetSecureJson(key),
  SECURE_STORE_KEYS: { user: 'TJBot_user' },
  setSecureJson: (key: string, value: unknown) => mockSetSecureJson(key, value),
}));

jest.mock('../../src/services/api/account', () => ({
  getAccountSummary: () => mockGetAccountSummary(),
}));

jest.mock('../../src/services/api/auth', () => ({
  login: (...args: [string, string]) => mockLogin(...args),
  logout: jest.fn(),
  signup: jest.fn(),
}));

jest.mock('../../src/features/device/pairing/localPairedDevice', () => ({
  clearLocalPairedDevice: () => mockClearLocalPairedDevice(),
}));

jest.mock('../../src/features/rewards/offline/rewardSeenQueue', () => ({
  clearRewardSeenQueue: (accountId: string | null) => mockClearRewardSeenQueue(accountId),
  setRewardQueueScope: (accountId: string | null, householdId: string | null) => mockSetRewardQueueScope(accountId, householdId),
  replayRewardSeenQueue: () => mockReplayRewardSeenQueue(),
}));

jest.mock('../../src/services/query/queryClient', () => ({
  appQueryClient: { removeQueries: (options: unknown) => mockRemoveQueries(options) },
}));

import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

function AuthProbe(): React.JSX.Element {
  const auth = useAuth();
  return <Text testID="auth-state">{auth.isAuthenticated ? 'AUTH' : 'NO_AUTH'}</Text>;
}

function FormProbe(): React.JSX.Element {
  const auth = useAuth();
  const [email, setEmail] = React.useState('user@test.com');
  const [password] = React.useState('Secret1!');
  const [formError, setFormError] = React.useState<string | null>(null);

  const submit = async () => {
    try {
      await auth.login(email, password);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e.message ?? 'Error');
    }
  };

  return (
    <>
      <Text testID="email-value">{email}</Text>
      <Text testID="password-value">{password}</Text>
      <Text testID="form-error">{formError ?? ''}</Text>
      <Text testID="auth-state">{auth.isAuthenticated ? 'AUTH' : 'NO_AUTH'}</Text>
      <Text testID="submit-btn" onPress={submit}>Submit</Text>
      <Text testID="email-input" onPress={() => setEmail('user@test.com')}>setEmail</Text>
    </>
  );
}

describe('AuthContext auth invalidation handler', () => {
  beforeEach(() => {
    mockAuthInvalidatedHandler = null;
    jest.clearAllMocks();
    mockGetAccountSummary.mockRejectedValue(new Error('Network Error'));
    mockGetAccessToken.mockResolvedValue('stored-access');
    mockGetSecureJson.mockResolvedValue({
      id: 'user-1',
      email: 'parent@example.test',
      name: 'Parent',
    });
  });

  it('clears local auth state when the HTTP client invalidates the session', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('AUTH');
    });
    expect(mockAuthInvalidatedHandler).not.toBeNull();

    await act(async () => {
      mockAuthInvalidatedHandler?.();
    });

    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('NO_AUTH');
    });
    expect(mockClearTokens).toHaveBeenCalled();
    expect(mockDeleteSecureItem).toHaveBeenCalledWith('TJBot_user');
    expect(mockClearLocalPairedDevice).toHaveBeenCalled();
    expect(mockClearRewardSeenQueue).not.toHaveBeenCalled();
    expect(mockSetRewardQueueScope).toHaveBeenLastCalledWith(null, null);
    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['rewards'] });
  });

  it('sets account scope without replaying before household hydration', async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>);

    await waitFor(() => expect(mockSetRewardQueueScope).toHaveBeenCalledWith('user-1', null));
    expect(mockReplayRewardSeenQueue).not.toHaveBeenCalled();
  });

  it('clears local auth state when stored token is rejected during hydration', async () => {
    mockGetAccountSummary.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized' } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('NO_AUTH');
    });
    expect(mockClearTokens).toHaveBeenCalled();
    expect(mockDeleteSecureItem).toHaveBeenCalledWith('TJBot_user');
    expect(mockClearLocalPairedDevice).toHaveBeenCalled();
    expect(mockClearRewardSeenQueue).not.toHaveBeenCalled();
    expect(mockReplayRewardSeenQueue).not.toHaveBeenCalled();
  });
});

describe('AuthContext — session expires mid-form submission', () => {
  beforeEach(() => {
    mockAuthInvalidatedHandler = null;
    jest.clearAllMocks();
    // No stored token → user starts unauthenticated (not hydrating an old session)
    mockGetAccessToken.mockResolvedValue(null);
    mockLogin.mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password.',
    });
  });

  it('shows actionable error and preserves inputs when token is invalidated between input and submit', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <FormProbe />
      </AuthProvider>,
    );

    // Wait for initial hydration to complete (no stored token → NOT_STARTED → stays NO_AUTH)
    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('NO_AUTH');
    });

    // User has filled the form (email + password pre-seeded in FormProbe state).
    // Simulate the auth-invalidated event firing just before submit
    // (e.g. another tab refreshed and the server rejected the token).
    await act(async () => {
      mockAuthInvalidatedHandler?.();
    });

    // Inputs must still be populated — the invalidation event must not clear them.
    expect(getByTestId('email-value').props.children).toBe('user@test.com');
    expect(getByTestId('password-value').props.children).toBe('Secret1!');

    // User submits — login call is rejected (token gone → 401 → INVALID_CREDENTIALS).
    await act(async () => {
      fireEvent.press(getByTestId('submit-btn'));
    });

    // Form must surface an actionable error message, not silently fail.
    await waitFor(() => {
      expect(getByTestId('form-error').props.children).toBeTruthy();
    });

    // Inputs still not cleared after submit failure.
    expect(getByTestId('email-value').props.children).toBe('user@test.com');
    expect(getByTestId('password-value').props.children).toBe('Secret1!');
  });
});

describe('AuthContext — multiple simultaneous auth-invalidated events', () => {
  beforeEach(() => {
    mockAuthInvalidatedHandler = null;
    jest.clearAllMocks();
    mockGetAccessToken.mockResolvedValue('stored-access');
    mockGetAccountSummary.mockRejectedValue(new Error('Network Error'));
    mockGetSecureJson.mockResolvedValue({
      id: 'user-1',
      email: 'parent@example.test',
      name: 'Parent',
    });
  });

  it('forceLogout runs to completion even when the invalidation handler fires multiple times rapidly', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('AUTH');
    });
    expect(mockAuthInvalidatedHandler).not.toBeNull();

    // Fire the invalidation handler 5 times in rapid succession
    // (simulates multiple screens/tabs reacting to the same 401 simultaneously).
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        mockAuthInvalidatedHandler?.();
      }
    });

    // Auth state must eventually reach NO_AUTH exactly once — no infinite loop,
    // no crash, no dangling promise.
    await waitFor(() => {
      expect(getByTestId('auth-state').props.children).toBe('NO_AUTH');
    });

    // clearTokens and deleteSecureItem may be called multiple times; both are
    // idempotent and the final unauthenticated state is what matters.
    expect(mockClearTokens).toHaveBeenCalled();
    expect(mockDeleteSecureItem).toHaveBeenCalledWith('TJBot_user');
  });
});
