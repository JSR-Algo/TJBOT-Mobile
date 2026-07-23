import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
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
import * as authApi from '../../src/services/api/auth';
import * as parentApi from '../../src/services/api/parent.api';
import * as accountApi from '../../src/services/api/account';
import { getChildLessonProgress, getChildProgress } from '../../src/services/api/progress.api';
import { getChildProfile, updateChildProfile, getKPIs, getPronunciationTrend } from '../../src/services/api/learning';
import { setActiveChild, updateChildDisplayName } from '../../src/services/api/households';
import { useHousehold } from '@/contexts/HouseholdContext';

jest.setTimeout(120_000);

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockParentMarkGated = jest.fn();
const mockParentTouchActivity = jest.fn();
const mockParentClearGate = jest.fn();
const mockHouseholdRefresh = jest.fn();
let mockParentSessionFresh = false;
let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

const mockNavigation = {
  navigate: mockNavigate,
  replace: jest.fn(),
};

const mockRoute = { key: 'parent-settings', name: ROUTES.ParentSettingsScreen, params: undefined };
const mockParentGateRoute = { key: 'parent-gate', name: ROUTES.ParentGateScreen, params: undefined };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as typeof import('@react-navigation/native');
  const ReactInner = require('react') as typeof import('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => undefined | (() => void)) => {
      ReactInner.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

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

jest.mock('../../src/services/api/auth', () => ({
  __esModule: true,
  AI_VOICE_CONSENT_VERSION: 'ai-voice-google-v1',
  GOOGLE_SUBPROCESSORS_VERSION: 'google-subprocessors-v1',
  recordAiVoiceConsent: jest.fn(),
  withdrawAiVoiceConsent: jest.fn(),
}));

jest.mock('../../src/services/api/account', () => ({
  cancelAccountDeletion: jest.fn(),
  getAccountDeletionStatus: jest.fn(),
  getAccountDeletionSubscriptionStatus: jest.fn(),
  getAccountExportStatus: jest.fn(),
  requestAccountDeletion: jest.fn(),
  requestAccountExport: jest.fn(),
  refreshEntitlementsAfterPurchase: jest.fn(),
}));

jest.mock('../../src/services/api/progress.api', () => ({
  __esModule: true,
  getChildProgress: jest.fn(),
  getChildLessonProgress: jest.fn(),
}));

jest.mock('../../src/services/api/learning', () => ({
  __esModule: true,
  getChildProfile: jest.fn(),
  updateChildProfile: jest.fn(),
  // ParentSummaryScreen's course-quality band fans out KPIs + pronunciation
  // trend (fault-tolerant). Mock them so the summary render path doesn't throw
  // on an undefined seam.
  getKPIs: jest.fn(),
  getPronunciationTrend: jest.fn(),
}));

jest.mock('../../src/services/api/households', () => ({
  __esModule: true,
  setActiveChild: jest.fn(),
  updateChildDisplayName: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

const parentApiMock = parentApi as jest.Mocked<typeof parentApi>;
const authApiMock = authApi as jest.Mocked<typeof authApi>;
const accountApiMock = accountApi as jest.Mocked<typeof accountApi>;
const mockGetChildProgress = getChildProgress as jest.MockedFunction<typeof getChildProgress>;
const mockGetChildLessonProgress = getChildLessonProgress as jest.MockedFunction<typeof getChildLessonProgress>;
const mockGetChildProfile = getChildProfile as jest.MockedFunction<typeof getChildProfile>;
const mockGetKPIs = getKPIs as jest.MockedFunction<typeof getKPIs>;
const mockGetPronunciationTrend = getPronunciationTrend as jest.MockedFunction<typeof getPronunciationTrend>;
const mockUpdateChildProfile = updateChildProfile as jest.MockedFunction<typeof updateChildProfile>;
const mockSetActiveChild = setActiveChild as jest.MockedFunction<typeof setActiveChild>;
const mockUpdateChildDisplayName = updateChildDisplayName as jest.MockedFunction<typeof updateChildDisplayName>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

// ParentToday/History read the child-scoped lesson-progress feed via TanStack
// Query + HouseholdContext; this helper supplies the query client for those
// screens (the household + lesson-progress fetch are mocked module-wide).
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

async function renderParentSettings() {
  const screen = render(
    <ParentSettingsScreen navigation={mockNavigation as never} route={mockRoute as never} />,
  );
  await screen.findByLabelText('Child name');
  return screen;
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
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await setAppLanguage('en');
    mockParentSessionFresh = false;
    parentApiMock.getParentSummary.mockRejectedValue(new Error('Parent summary API route not documented'));
    parentApiMock.getParentToday.mockRejectedValue(new Error('Parent today API route not documented'));
    parentApiMock.getParentHistory.mockRejectedValue(new Error('Parent history API route not documented'));
    authApiMock.recordAiVoiceConsent.mockResolvedValue({
      consent_id: 'voice-consent-1',
      household_id: 'household-1',
      consent_version: 'ai-voice-google-v1',
      google_subprocessors_version: 'google-subprocessors-v1',
      status: 'active',
      granted_at: '2026-07-02T00:00:00.000Z',
    });
    authApiMock.withdrawAiVoiceConsent.mockResolvedValue({
      consent_id: 'voice-consent-1',
      household_id: 'household-1',
      status: 'withdrawn',
      withdrawn_at: '2026-07-02T00:05:00.000Z',
    });
    mockedUseHousehold.mockReturnValue({
      children: [{ id: 'child-1', household_id: 'household-1', name: 'Mai' }, { id: 'child-2', household_id: 'household-1', name: 'An' }],
      activeChild: { id: 'child-1', household_id: 'household-1', name: 'Mai' },
      refresh: mockHouseholdRefresh,
      setActiveChild: jest.fn(),
    } as never);
    mockGetChildProgress.mockResolvedValue({ childId: 'child-1', lessonsCompleted: 0, currentStreakDays: 0, masteredWords: 0, byCourse: [] });
    mockGetChildLessonProgress.mockResolvedValue([]);
    mockGetKPIs.mockResolvedValue({
      vocab_words_this_week: 0, speaking_confidence: 0, engagement_score: 0,
      retention_rate: 0, sessions_this_week: 0, daily_streak: 0, weak_words: [],
    });
    mockGetPronunciationTrend.mockResolvedValue({ points: [], avg_score: 0, trend: 'none' as never });
    mockGetChildProfile.mockResolvedValue({
      id: 'child-1',
      name: 'Mai',
      vocabulary_level: 'beginner',
      speaking_confidence: 50,
      listening_score: 40,
      interests: ['animals'],
      attention_span_seconds: 180,
      learning_style: 'visual',
      parent_career: 'engineer',
    });
    mockUpdateChildProfile.mockImplementation(async (_childId, dto) => ({
      id: 'child-1',
      name: 'Mai',
      vocabulary_level: dto.vocabulary_level ?? 'beginner',
      speaking_confidence: 50,
      listening_score: 40,
      interests: dto.interests ?? ['animals'],
      attention_span_seconds: 180,
      learning_style: dto.learning_style ?? 'visual',
      parent_career: dto.parent_career ?? 'engineer',
    }));
    mockUpdateChildDisplayName.mockResolvedValue({ id: 'child-1', displayName: 'Bong' });
    mockSetActiveChild.mockResolvedValue({ active_child_id: 'child-2' });
    accountApiMock.getAccountDeletionSubscriptionStatus.mockResolvedValue('inactive');
  });

  afterEach(async () => {
    try {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('confirms before sign out, then uses AuthContext logout so the root auth gate resets navigation', async () => {
    // Sign out is destructive: it must go through an Alert confirm, not fire on
    // the first tap. Capture the alert and invoke its destructive button.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText } = await renderParentSettings();

    fireEvent.press(getByText('Sign out'));
    // Tapping the row only opens the confirm — no logout yet.
    expect(mockLogout).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    const confirm = buttons.find((b) => b?.style === 'destructive');
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.LoginScreen);
    alertSpy.mockRestore();
  });

  it('does not ship dead placeholder rows (plan status / prototype data / mass "Unavailable")', async () => {
    const { queryByText } = await renderParentSettings();

    // These dead "Unavailable" rows were removed for production: a settings
    // screen full of unbacked placeholders reads as broken.
    expect(queryByText('Plan status')).toBeNull();
    expect(queryByText('Billing portal')).toBeNull();
    expect(queryByText('Child age')).toBeNull();
    // Never surface prototype/hardcoded entitlement or child data.
    expect(queryByText('Robot English Plus')).toBeNull();
    expect(queryByText('Active')).toBeNull();
    expect(queryByText('Mira')).toBeNull();
  });

  it('lets parents update career and child interest filters used for lesson personalization', async () => {
    const screen = await renderParentSettings();

    expect(await screen.findByText('PERSONALITY FILTERS')).toBeTruthy();
    // Chip labels are now localized (en identity keys) — enum values stay the
    // wire payload.
    expect(await screen.findByText('Engineer')).toBeTruthy();
    expect(await screen.findByText('Animals')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Teacher'));
    });
    expect(mockUpdateChildProfile).toHaveBeenCalledWith('child-1', expect.objectContaining({ parent_career: 'teacher' }));

    await act(async () => {
      fireEvent.press(screen.getByText('Space'));
    });
    expect(mockUpdateChildProfile).toHaveBeenCalledWith('child-1', expect.objectContaining({ interests: expect.arrayContaining(['space']) }));
  });

  it('lets parents edit the child display name used by robot personalization', async () => {
    const screen = await renderParentSettings();

    const input = await screen.findByLabelText('Child name');
    fireEvent.changeText(input, 'Bong');

    await act(async () => {
      fireEvent.press(screen.getByText('Save child name'));
    });

    expect(mockUpdateChildDisplayName).toHaveBeenCalledWith('child-1', 'Bong', 'household-1');
    expect(mockHouseholdRefresh).toHaveBeenCalledTimes(1);
  });

  it('uses the canonical child display name returned by the household server', async () => {
    mockUpdateChildDisplayName.mockResolvedValueOnce({ id: 'child-1', displayName: 'Bong Mai' });
    const screen = await renderParentSettings();
    const input = await screen.findByLabelText('Child name');
    await waitFor(() => expect(input.props.value).toBe('Mai'));
    await screen.findByText('beginner');

    fireEvent.changeText(input, '  Bong   Mai  ');
    await act(async () => {
      fireEvent.press(screen.getByText('Save child name'));
    });

    await waitFor(() => {
      expect(mockUpdateChildDisplayName).toHaveBeenCalledWith('child-1', 'Bong   Mai', 'household-1');
      expect(screen.getByLabelText('Child name').props.value).toBe('Bong Mai');
    });
  });

  it('changes active child only after the household server confirms it', async () => {
    const localSelect = jest.fn();
    mockedUseHousehold.mockReturnValue({
      children: [{ id: 'child-1', household_id: 'household-1', name: 'Mai' }, { id: 'child-2', household_id: 'household-1', name: 'An' }],
      activeChild: { id: 'child-1', household_id: 'household-1', name: 'Mai' },
      refresh: mockHouseholdRefresh,
      setActiveChild: localSelect,
    } as never);
    const screen = await renderParentSettings();
    await act(async () => { fireEvent.press(screen.getByLabelText('Select An as active child')); });
    expect(mockSetActiveChild).toHaveBeenCalledWith('child-2');
    expect(localSelect).toHaveBeenCalledWith('child-2');
  });

  it('opens account privacy controls from settings', async () => {
    const { getByText } = await renderParentSettings();

    fireEvent.press(getByText('Account privacy'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentAccountPrivacyScreen);
  });

  it('opens account deletion from the visible privacy section', async () => {
    const screen = await renderParentSettings();
    fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentAccountPrivacyScreen);
  });

  it.each([
    { locale: 'en' as const, label: 'Robot leaderboard privacy' },
    { locale: 'vi' as const, label: 'Quyền riêng tư bảng xếp hạng Robot' },
  ])('opens robot leaderboard privacy from settings in $locale', async ({ locale, label }) => {
    await setAppLanguage(locale);
    const screen = await renderParentSettings();

    fireEvent.press(screen.getByRole('button', { name: label }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MyRobotScreen);
  });

  it('lets parents allow AI voice lessons from settings so Robot leaves voice setup block', async () => {
    const screen = await renderParentSettings();

    await act(async () => {
      fireEvent.press(screen.getByText('Allow voice lessons'));
    });

    expect(authApiMock.recordAiVoiceConsent).toHaveBeenCalledWith({
      consent_version: 'ai-voice-google-v1',
      google_subprocessors_version: 'google-subprocessors-v1',
    });
    expect(await screen.findByText('Voice setup saved. Robot can listen during lessons.')).toBeTruthy();
  });

  it('lets parents pause AI voice lessons from settings', async () => {
    const screen = await renderParentSettings();

    await act(async () => {
      fireEvent.press(screen.getByText('Pause voice lessons'));
    });

    expect(authApiMock.withdrawAiVoiceConsent).toHaveBeenCalledWith({
      reason: 'Parent paused AI voice lessons from mobile settings.',
    });
    expect(await screen.findByText('Voice lessons paused. Robot will ask a parent before listening.')).toBeTruthy();
  });

  it('shows retry copy when AI voice setup cannot be saved', async () => {
    authApiMock.recordAiVoiceConsent.mockRejectedValueOnce(new Error('consent failed'));
    const screen = await renderParentSettings();

    await act(async () => {
      fireEvent.press(screen.getByText('Allow voice lessons'));
    });

    expect(await screen.findByText('Voice setup could not be saved. Try again.')).toBeTruthy();
    expect(screen.queryByText('Voice setup saved. Robot can listen during lessons.')).toBeNull();
  });

  it('labels parent settings rows with their action and current state for screen readers', async () => {
    const { getByLabelText } = await renderParentSettings();

    fireEvent.press(getByLabelText('Open Safety & Privacy details'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentSafetyScreen);
    expect(getByLabelText('English, Selected')).toBeTruthy();
    expect(getByLabelText('Tiếng Việt, Not selected')).toBeTruthy();
  });

  it('defaults app language to Vietnamese, switches to English, and persists the choice', async () => {
    await AsyncStorage.clear();
    await loadAppLanguagePreference();

    const view = await renderParentSettings();

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

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
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

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
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

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
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
    accountApiMock.getAccountDeletionSubscriptionStatus.mockResolvedValueOnce('active');

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(screen.getByText('Cancel active subscription before deleting this account.')).toBeTruthy());
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('blocks deletion while subscription status is loading', () => {
    const pending = deferred<Awaited<ReturnType<typeof accountApi.getAccountDeletionSubscriptionStatus>>>();
    accountApiMock.getAccountDeletionSubscriptionStatus.mockReturnValueOnce(pending.promise);

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    expect(screen.getByText('Checking subscription before account deletion.')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('blocks deletion when subscription status cannot be verified', async () => {
    accountApiMock.getAccountDeletionSubscriptionStatus.mockRejectedValueOnce(new Error('subscription check failed'));

    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Subscription status unavailable. Try again before deleting this account.')).toBeTruthy();
    expect(screen.getByLabelText('Request account deletion').props.accessibilityState).toEqual({ disabled: true });
    expect(accountApiMock.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it('labels account privacy actions for screen readers', async () => {
    const screen = render(
      <ParentAccountPrivacyScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));

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

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
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

    await waitFor(() => expect(accountApiMock.getAccountDeletionSubscriptionStatus).toHaveBeenCalledTimes(1));
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
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
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
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
    const timeout = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(timeout.getByText('Today summary unavailable')).toBeTruthy());
    expect(timeout.queryByText('Today: 2 lessons, 11 minutes.')).toBeNull();
  });

  it('labels parent back navigation with the destination screen', async () => {
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
    const screen = renderWithQuery(
      <ParentTodayScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    fireEvent.press(screen.getByLabelText('Back to Parent Space'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ParentSummaryScreen);
    screen.unmount();
  });

  it('keeps parent history blocked instead of rendering generated 30-day rows', async () => {
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
    const { getByText, queryByText } = renderWithQuery(
      <ParentHistoryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('History unavailable')).toBeTruthy());
    expect(queryByText('Greetings & feelings')).toBeNull();
    expect(queryByText('1 lesson · 9 min')).toBeNull();
  });

  it('shows the history error state with a retry affordance and no generated stale rows', async () => {
    mockGetChildLessonProgress.mockRejectedValue(new Error('lesson-progress unavailable'));
    const { getByLabelText, getByText, queryByText } = renderWithQuery(
      <ParentHistoryScreen navigation={mockNavigation as never} route={mockRoute as never} />,
    );

    await waitFor(() => expect(getByText('History unavailable')).toBeTruthy());
    expect(queryByText('Greetings & feelings')).toBeNull();

    fireEvent.press(getByLabelText('Retry History unavailable'));
    await waitFor(() => expect(mockGetChildLessonProgress.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

});
