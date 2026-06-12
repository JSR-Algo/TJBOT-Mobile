import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/navigation/routes';
import {
  APP_LANGUAGE_STORAGE_KEY,
  loadAppLanguagePreference,
  setAppLanguage,
} from '../../src/services/i18n/i18n';
import ParentSettingsScreen from '../../src/features/parent/screens/ParentSettingsScreen';
import ParentGateScreen from '../../src/features/parent/screens/ParentGateScreen';
import ParentLockedOutScreen from '../../src/features/parent/screens/ParentLockedOutScreen';
import ParentSummaryScreen from '../../src/features/parent/screens/ParentSummaryScreen';
import ParentTodayScreen from '../../src/features/parent/screens/ParentTodayScreen';
import ParentHistoryScreen from '../../src/features/parent/screens/ParentHistoryScreen';
import ParentAccountPrivacyScreen from '../../src/features/parent/screens/ParentAccountPrivacyScreen';
import * as parentApi from '../../src/services/api/parent.api';
import * as accountApi from '../../src/services/api/account';
import { getChildLessonProgress } from '../../src/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';

jest.setTimeout(120_000);

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockParentMarkGated = jest.fn();
const mockParentTouchActivity = jest.fn();
const mockParentClearGate = jest.fn();
let mockParentSessionFresh = false;

const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
};

const mockRoute = { key: 'parent-settings', name: ROUTES.ParentSettingsScreen, params: undefined };
const mockParentGateRoute = { key: 'parent-gate', name: ROUTES.ParentGateScreen, params: undefined };

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'parent-1', email: 'parent@example.com', name: 'Parent One' },
    logout: mockLogout,
  }),
}));

jest.mock('../../src/features/parent/context/ParentSessionContext', () => ({
  useParentSession: () => ({
    isFresh: () => mockParentSessionFresh,
    markGated: mockParentMarkGated,
    touchActivity: mockParentTouchActivity,
    clearGate: mockParentClearGate,
  }),
}));

jest.mock('../../src/services/api/parent.api', () => ({
  authenticateParent: jest.fn(),
  clearParentLockout: jest.fn(),
  getParentSummary: jest.fn(),
  getParentToday: jest.fn(),
  getParentHistory: jest.fn(),
  getSafetyConfig: jest.fn(),
  updateSafetyConfig: jest.fn(),
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

jest.mock('../../src/services/api/account', () => ({
  cancelAccountDeletion: jest.fn(),
  getAccountDeletionStatus: jest.fn(),
  getAccountExportStatus: jest.fn(),
  requestAccountDeletion: jest.fn(),
  requestAccountExport: jest.fn(),
  refreshEntitlementsAfterPurchase: jest.fn(),
}));

jest.mock('../../src/services/api/progress.api', () => ({
  __esModule: true,
  getChildLessonProgress: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

const parentApiMock = parentApi as jest.Mocked<typeof parentApi>;
const accountApiMock = accountApi as jest.Mocked<typeof accountApi>;
const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

// ParentToday/History read the child-scoped lesson-progress feed via TanStack
// Query + HouseholdContext; this helper supplies the query client for those
// screens (the household + lesson-progress fetch are mocked module-wide).
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void } {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

describe('Parent settings and gate', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await setAppLanguage('en');
    mockParentSessionFresh = false;
    parentApiMock.getParentSummary.mockRejectedValue(new Error('Parent summary API route not documented'));
    parentApiMock.getParentToday.mockRejectedValue(new Error('Parent today API route not documented'));
    parentApiMock.getParentHistory.mockRejectedValue(new Error('Parent history API route not documented'));
    mockedUseHousehold.mockReturnValue({ children: [{ id: 'child-1' }], activeChild: { id: 'child-1' } } as never);
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
    accountApiMock.refreshEntitlementsAfterPurchase.mockResolvedValue({
      courses: [],
      subscriptionStatus: 'none',
      robotActivated: true,
    });
  });

  it('uses AuthContext logout for sign out so the root auth gate resets navigation', async () => {
    const { getByText } = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(getByText('Sign out'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.LoginScreen);
  });

  it('blocks plan status instead of rendering hardcoded or schema-less entitlement text', () => {
    const { getAllByText, getByText, queryByText } = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(getByText('Plan status')).toBeTruthy();
    expect(getAllByText('Unavailable').length).toBeGreaterThanOrEqual(1);
    expect(queryByText('Robot English Plus')).toBeNull();
    expect(queryByText('Active')).toBeNull();
  });

  it('does not render prototype child profile or subscription data in parent settings', async () => {
    const { getAllByText, queryByText } = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(queryByText('Mira')).toBeNull();
    expect(queryByText('7')).toBeNull();
    expect(queryByText('Active')).toBeNull();
    expect(getAllByText('Unavailable').length).toBeGreaterThanOrEqual(9);
  });

  it('opens account privacy controls from settings', () => {
    const { getByText } = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(getByText('Account privacy'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentAccountPrivacyScreen);
  });

  it('labels parent settings rows with their action and current state for screen readers', () => {
    const { getByLabelText } = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(getByLabelText('Open Safety & Privacy details'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentSafetyScreen);
    expect(getByLabelText('English, Selected')).toBeTruthy();
    expect(getByLabelText('Tiếng Việt, Not selected')).toBeTruthy();
  });

  it('defaults app language to Vietnamese, switches to English, and persists the choice', async () => {
    await AsyncStorage.clear();
    await loadAppLanguagePreference();

    const view = render(
      <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(view.getByText('Ngôn ngữ ứng dụng')).toBeTruthy();
    expect(view.getAllByText('Tiếng Việt').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      fireEvent.press(view.getByText('English'));
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(APP_LANGUAGE_STORAGE_KEY, 'en');
    });
    expect(view.getByText('App language')).toBeTruthy();
  });

  it('requires export confirmation and refreshes status only from user action', async () => {
    accountApiMock.requestAccountExport.mockResolvedValueOnce({
      jobId: 'export-1',
      state: 'pending',
      etaSeconds: 1800,
      signedUrl: null,
      expiresAt: null,
    });
    accountApiMock.getAccountExportStatus.mockResolvedValueOnce({
      jobId: 'export-1',
      state: 'completed',
      etaSeconds: null,
      signedUrl: 'https://exports.test/archive.zip',
      expiresAt: '2026-06-01T00:00:00.000Z',
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText('Request export'));
    expect(screen.getByText('Type EXPORT to request your account archive.')).toBeTruthy();
    expect(accountApiMock.requestAccountExport).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(screen.getByText('Request export'));
    });

    expect(accountApiMock.requestAccountExport).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Export pending')).toBeTruthy();
    expect(accountApiMock.getAccountExportStatus).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByText('Refresh export status'));
    });

    expect(accountApiMock.getAccountExportStatus).toHaveBeenCalledWith('export-1');
    expect(screen.getByText('Export ready')).toBeTruthy();
  });

  it('shows safe copy when account export download cannot open', async () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('expired URL'));
    accountApiMock.requestAccountExport.mockResolvedValueOnce({
      jobId: 'export-1',
      state: 'completed',
      etaSeconds: null,
      signedUrl: 'https://exports.test/archive.zip',
      expiresAt: '2026-06-01T00:00:00.000Z',
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(screen.getByText('Request export'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Download export'));
    });

    expect(openUrlSpy).toHaveBeenCalledWith('https://exports.test/archive.zip');
    expect(screen.getByText('Export download could not open. Request a new export if the link expired.')).toBeTruthy();
    openUrlSpy.mockRestore();
  });

  it('rejects unsafe account export download URLs before opening', async () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    accountApiMock.requestAccountExport.mockResolvedValueOnce({
      jobId: 'export-1',
      state: 'completed',
      etaSeconds: null,
      signedUrl: 'javascript:alert(1)',
      expiresAt: '2026-06-01T00:00:00.000Z',
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(screen.getByText('Request export'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Download export'));
    });

    expect(openUrlSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Export download could not open. Request a new export if the link expired.')).toBeTruthy();
    openUrlSpy.mockRestore();
  });

  it('blocks deletion while subscription is active', async () => {
    accountApiMock.refreshEntitlementsAfterPurchase.mockResolvedValueOnce({
      courses: [],
      subscriptionStatus: 'active',
      robotActivated: true,
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(screen.getByText('Cancel active subscription before deleting this account.')).toBeTruthy());
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('blocks deletion while subscription status is loading', () => {
    const pending = deferred<Awaited<ReturnType<typeof accountApi.refreshEntitlementsAfterPurchase>>>();
    accountApiMock.refreshEntitlementsAfterPurchase.mockReturnValueOnce(pending.promise);

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(screen.getByText('Checking subscription before account deletion.')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('blocks deletion when subscription status cannot be verified', async () => {
    accountApiMock.refreshEntitlementsAfterPurchase.mockRejectedValueOnce(new Error('entitlement check failed'));

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Subscription status unavailable. Try again before deleting this account.')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('labels account privacy actions for screen readers', async () => {
    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));

    expect(screen.getByLabelText('Request account export')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion')).toBeTruthy();
    expect(screen.getByLabelText('Export confirmation')).toBeTruthy();
    expect(screen.getByLabelText('Delete confirmation phrase')).toBeTruthy();
    expect(screen.getByLabelText('Account password')).toBeTruthy();
  });

  it('requires delete phrase and password before scheduling deletion', async () => {
    accountApiMock.requestAccountDeletion.mockResolvedValueOnce({
      deletionJobId: 'delete-1',
      status: 'in_grace_period',
      gracePeriodEndsAt: '2026-06-15T00:00:00.000Z',
      completedAt: null,
      cancelable: true,
      cancelledAt: null,
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('DELETE my account'), 'DELETE my account');

    await act(async () => {
      fireEvent.press(screen.getByText('Request deletion'));
    });

    expect(screen.getByText('Enter your password to continue.')).toBeTruthy();
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'CorrectHorseBattery!9');
    await act(async () => {
      fireEvent.press(screen.getByText('Request deletion'));
    });

    expect(accountApiMock.requestAccountDeletion).toHaveBeenCalledWith(
      {
        confirmPhrase: 'DELETE my account',
        password: 'CorrectHorseBattery!9',
        reason: 'Requested from mobile parent settings.',
      },
      expect.stringMatching(/^privacy-delete-/),
    );
    expect(screen.getByText('Deletion grace period active')).toBeTruthy();
  });

  it('renders privacy 409, 403, and 410 errors with distinct copy', async () => {
    accountApiMock.requestAccountExport.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Conflict', retryable: false });
    const conflict = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(conflict.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(conflict.getByText('Request export'));
    });
    expect(conflict.getByText('Request already exists or cannot start yet.')).toBeTruthy();
    conflict.unmount();

    accountApiMock.requestAccountExport.mockRejectedValueOnce({ code: 'FORBIDDEN', message: 'Forbidden', retryable: false });
    const forbidden = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );
    fireEvent.changeText(forbidden.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(forbidden.getByText('Request export'));
    });
    expect(forbidden.getByText('You do not have permission for this account action.')).toBeTruthy();
    forbidden.unmount();

    accountApiMock.requestAccountExport.mockRejectedValueOnce({ code: 'GONE', message: 'Gone', retryable: false });
    const gone = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );
    fireEvent.changeText(gone.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(gone.getByText('Request export'));
    });
    expect(gone.getByText('This privacy link or export has expired. Request a new one.')).toBeTruthy();
  });

  it('renders Axios-shaped privacy errors with safe mapped copy', async () => {
    accountApiMock.requestAccountExport.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { code: 'RATE_LIMIT_EXCEEDED', message: 'raw server detail' },
      },
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('EXPORT'), 'EXPORT');
    await act(async () => {
      fireEvent.press(screen.getByText('Request export'));
    });

    expect(screen.getByText('Privacy request limit reached. Try again later.')).toBeTruthy();
    expect(screen.queryByText('raw server detail')).toBeNull();
  });

  it('cancels deletion and restores the safe UI state', async () => {
    accountApiMock.requestAccountDeletion.mockResolvedValueOnce({
      deletionJobId: 'delete-1',
      status: 'in_grace_period',
      gracePeriodEndsAt: '2026-06-15T00:00:00.000Z',
      completedAt: null,
      cancelable: true,
      cancelledAt: null,
    });
    accountApiMock.cancelAccountDeletion.mockResolvedValueOnce({
      deletionJobId: 'delete-1',
      status: 'cancelled',
      gracePeriodEndsAt: null,
      completedAt: null,
      cancelable: false,
      cancelledAt: '2026-05-16T00:00:00.000Z',
    });

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.refreshEntitlementsAfterPurchase).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('DELETE my account'), 'DELETE my account');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'CorrectHorseBattery!9');
    await act(async () => {
      fireEvent.press(screen.getByText('Request deletion'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Cancel deletion'));
    });

    expect(accountApiMock.cancelAccountDeletion).toHaveBeenCalledWith('delete-1');
    expect(screen.getByText('Deletion cancelled')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: false });
  });

  it('opens the protected parent summary after a valid PIN', async () => {
    parentApiMock.authenticateParent.mockResolvedValueOnce({
      authenticated: true,
      authenticated_at: '2026-05-14T00:15:00.000Z',
    });

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '1234');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(parentApiMock.authenticateParent).toHaveBeenCalledWith({ pin: '1234' });
    expect(mockParentMarkGated).toHaveBeenCalledTimes(1);
    expect(mockNavigation.replace).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });

  it('opens the requested protected parent screen after a valid PIN', async () => {
    parentApiMock.authenticateParent.mockResolvedValueOnce({
      authenticated: true,
      authenticated_at: '2026-05-14T00:15:00.000Z',
    });

    const route = {
      ...mockParentGateRoute,
      params: { next: ROUTES.ParentSettingsScreen },
    };

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={route as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '1234');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(mockParentMarkGated).toHaveBeenCalledTimes(1);
    expect(mockNavigation.replace).toHaveBeenCalledWith(ROUTES.ParentSettingsScreen);
  });

  it('does not open parent summary when parent auth response is not explicitly authenticated', async () => {
    parentApiMock.authenticateParent.mockResolvedValueOnce({
      authenticated: false,
      authenticated_at: undefined,
    });

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '1234');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(getByText('Parent PIN was not accepted. Try again.')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
    expect(mockNavigation.replace).not.toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });

  it('shows retry feedback after an incorrect PIN without leaving the gate', async () => {
    parentApiMock.authenticateParent.mockRejectedValueOnce(
      Object.assign(new Error('Wrong PIN'), { status: 401 }),
    );

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '1111');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(getByText('Wrong PIN. Try again.')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });

  it('routes to lockout when the server reports too many attempts', async () => {
    parentApiMock.authenticateParent.mockRejectedValueOnce(
      Object.assign(new Error('Locked'), {
        status: 423,
        lockedUntil: '2026-05-14T00:15:00.000Z',
      }),
    );

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '2222');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(mockNavigation.replace).toHaveBeenCalledWith(ROUTES.ParentLockedOutScreen);
  });

  it('keeps the PIN field disabled only until the rate-limit window expires', async () => {
    jest.useFakeTimers();
    parentApiMock.authenticateParent.mockRejectedValueOnce(
      Object.assign(new Error('Rate limited'), { status: 429, retryAfterSeconds: 30 }),
    );

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '3333');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(getByText('Too many attempts. Try again in 30 seconds.')).toBeTruthy();
    expect(getByPlaceholderText('Parent PIN').props.editable).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(getByText('You can try again now.')).toBeTruthy();
    expect(getByPlaceholderText('Parent PIN').props.editable).toBe(true);
    jest.useRealTimers();
  });

  it('shows parent-friendly cooldown copy while rate-limited', async () => {
    parentApiMock.authenticateParent.mockRejectedValueOnce(
      Object.assign(new Error('Rate limited'), { status: 429, retryAfterSeconds: 30 }),
    );

    const { getByPlaceholderText, getByText } = render(
      <ParentGateScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.changeText(getByPlaceholderText('Parent PIN'), '3333');
    await act(async () => {
      fireEvent.press(getByText('Confirm'));
    });

    expect(getByText('Too many attempts. Try again in 30 seconds.')).toBeTruthy();
    expect(getByText('This protects parent controls from child access.')).toBeTruthy();
    expect(getByPlaceholderText('Parent PIN').props.editable).toBe(false);
    expect(getByText('Confirm').props.accessibilityRole).toBe('button');
    expect(getByText('Confirm').props.accessibilityState).toEqual({ disabled: true });
  });

  it('recovers from lockout through the clear-lockout action', async () => {
    parentApiMock.clearParentLockout.mockResolvedValueOnce({ cleared: true });

    const { getByText } = render(
      <ParentLockedOutScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Unlock with parent account'));
    });

    await waitFor(() => {
      expect(parentApiMock.clearParentLockout).toHaveBeenCalledWith({ targetUserId: 'parent-1' });
    });
    expect(mockNavigation.replace).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
  });

  it('keeps lockout recoverable when clear-lockout fails', async () => {
    parentApiMock.clearParentLockout.mockRejectedValueOnce(new Error('network down'));

    const { getByText } = render(
      <ParentLockedOutScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Unlock with parent account'));
    });

    await waitFor(() => expect(getByText('Could not clear the lockout. Try again.')).toBeTruthy());
    fireEvent.press(getByText('Contact support'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'account', errorFamily: 'app_error' },
    });
  });

  it('keeps parent summary failures explicit when the backend contract is unavailable', async () => {
    parentApiMock.getParentSummary.mockRejectedValueOnce(Object.assign(new Error('Parent summary API route not documented'), { code: 'BACKEND_CONTRACT_UNAVAILABLE' }));
    const { getByText, queryByText } = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(getByText('Loading parent summary')).toBeTruthy();
    await waitFor(() => expect(parentApiMock.getParentSummary).toHaveBeenCalledTimes(1));
    expect(getByText('Parent summary unavailable')).toBeTruthy();
    expect(getByText('Try again.')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Mira practiced greetings and feelings for about 8 minutes.')).toBeNull();
    expect(queryByText('Your child practiced 3 lessons for 18 minutes this week.')).toBeNull();
  });

  it('does not stay loading when parent summary unexpectedly resolves without a typed contract', async () => {
    parentApiMock.getParentSummary.mockResolvedValueOnce(undefined as never);

    const { getByText, queryByText } = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(parentApiMock.getParentSummary).toHaveBeenCalledTimes(1));
    expect(getByText('Parent summary unavailable')).toBeTruthy();
    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Loading parent summary')).toBeNull();
  });

  it('shows parent summary failure copy when the backend contract is unavailable', async () => {
    parentApiMock.getParentSummary.mockRejectedValueOnce(new Error('Parent summary API route not documented'));

    const { getByText, queryByText } = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('Parent summary unavailable')).toBeTruthy());
    expect(queryByText('No lesson activity has synced yet.')).toBeNull();
    expect(queryByText('Mira practiced greetings and feelings for about 8 minutes.')).toBeNull();
  });

  it('shows requested summary context from notification route params without guessing backend fields', async () => {
    const { getByText, queryByText } = render(
      <ParentSummaryScreen
        navigation={mockNavigation as never}
        route={{
          ...mockRoute,
          params: { deviceId: 'device-1', summaryDate: '2026-05-16' },
        } as never}
      />,
    );

    await waitFor(() => expect(parentApiMock.getParentSummary).toHaveBeenCalledTimes(1));
    expect(getByText('Requested summary: 2026-05-16')).toBeTruthy();
    expect(getByText('Robot: device-1')).toBeTruthy();
    expect(queryByText('Mira practiced greetings and feelings for about 8 minutes.')).toBeNull();
  });

  it('shows parent summary rate limit and outage states with retry copy', async () => {
    parentApiMock.getParentSummary.mockRejectedValueOnce(
      Object.assign(new Error('Rate limited'), { status: 429, retryAfterSeconds: 30, code: 'RATE_LIMIT_EXCEEDED' }),
    );

    const rateLimited = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(rateLimited.getByText('Parent summary refresh limited')).toBeTruthy());
    expect(rateLimited.getByText('Try again in 30 seconds.')).toBeTruthy();
    fireEvent.press(rateLimited.getByLabelText('Retry Parent summary refresh limited'));
    await waitFor(() => expect(parentApiMock.getParentSummary).toHaveBeenCalledTimes(2));
    rateLimited.unmount();

    parentApiMock.getParentSummary.mockRejectedValueOnce(
      Object.assign(new Error('Bad gateway'), { status: 502, code: 'INTERNAL_ERROR' }),
    );
    const outage = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(outage.getByText('Parent summary service unavailable')).toBeTruthy());
    expect(outage.getByText('Retry in a moment.')).toBeTruthy();
  });

  it('renders dynamic parent summary copy in Vietnamese', async () => {
    await setAppLanguage('vi');
    parentApiMock.getParentSummary.mockResolvedValueOnce({ weekMinutes: 5, weekLessons: 2, streak: 3, topWords: [] });

    const { getByText } = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('Tuần này: 2 bài và 5 phút.')).toBeTruthy());
    expect(getByText('2 bài trong tuần này')).toBeTruthy();
  });

  it('exposes parent summary navigation controls with clear accessibility labels', async () => {
    const screen = render(
      <ParentSummaryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(screen.getByLabelText('Open Parent Space settings'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentSettingsScreen);
    screen.unmount();
  });

  it('keeps today summary blocked instead of rendering hardcoded or guessed rows', async () => {
    const { getByText, queryByText } = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('Today summary unavailable')).toBeTruthy());
    expect(queryByText('Mira practiced greetings, feelings, and three new words.')).toBeNull();
    expect(queryByText('Hello')).toBeNull();
    expect(queryByText('Today: 2 lessons, 11 minutes.')).toBeNull();
  });

  it('shows the empty state instead of stale rows when there is no active lesson', async () => {
    mockGetChildLessonProgress.mockReset();
    mockGetChildLessonProgress.mockResolvedValueOnce([]);

    const { getByText, queryByText } = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('No lessons yet')).toBeTruthy());
    expect(queryByText("Loading today's progress")).toBeNull();
    expect(queryByText('Mira practiced greetings, feelings, and three new words.')).toBeNull();
  });

  it('shows the today error state without stale data', async () => {
    const timeout = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(timeout.getByText('Today summary unavailable')).toBeTruthy());
    expect(timeout.queryByText('Today: 2 lessons, 11 minutes.')).toBeNull();
  });

  it('labels parent back navigation with the destination screen', async () => {
    const screen = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(screen.getByLabelText('Back to Parent Space'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
    screen.unmount();
  });

  it('keeps parent history blocked instead of rendering generated 30-day rows', async () => {
    const { getByText, queryByText } = renderWithQuery(
      <ParentHistoryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('History unavailable')).toBeTruthy());
    expect(queryByText('Greetings & feelings')).toBeNull();
    expect(queryByText('1 lesson · 9 min')).toBeNull();
  });

  it('shows the history error state with a retry affordance and no generated stale rows', async () => {
    const { getByLabelText, getByText, queryByText } = renderWithQuery(
      <ParentHistoryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('History unavailable')).toBeTruthy());
    expect(queryByText('Greetings & feelings')).toBeNull();

    fireEvent.press(getByLabelText('Retry History unavailable'));
    await waitFor(() => expect(mockGetChildLessonProgress.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

});
