/**
 * Unit tests for the TJBot mobile onboarding flow.
 *
 * TJBot mobile kid-intro flow:
 *   Splash → Welcome → IntroListen → IntroSpeak → IntroRetry → IntroCelebrate
 *           → Trust → MicAsk → FirstLessonEntry → LessonReady (lesson-session)
 *
 * Production parent-setup screens (HouseholdCreate/AddChild/InterestSetup/
 * DeviceSetupIntro/VoiceTest/CoppaConsent) retired in PR5 per user directive;
 * their tests dropped.
 */
import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import SplashScreen from '../../src/features/onboarding/screens/SplashScreen';
import WelcomeScreen from '../../src/features/onboarding/screens/WelcomeScreen';
import IntroListenScreen from '../../src/features/onboarding/screens/IntroListenScreen';
import IntroSpeakScreen from '../../src/features/onboarding/screens/IntroSpeakScreen';
import IntroRetryScreen from '../../src/features/onboarding/screens/IntroRetryScreen';
import IntroCelebrateScreen from '../../src/features/onboarding/screens/IntroCelebrateScreen';
import TrustScreen from '../../src/features/onboarding/screens/TrustScreen';
import MicAskScreen from '../../src/features/onboarding/screens/MicAskScreen';
import FirstLessonEntryScreen from '../../src/features/onboarding/screens/FirstLessonEntryScreen';
import { ROUTES } from '../../src/navigation/routes';
import * as authApi from '../../src/services/api/auth';

jest.mock('../../src/services/api/auth', () => ({
  sendConsent: jest.fn(async () => undefined),
  recordAiVoiceConsent: jest.fn(async () => ({ consent_id: 'voice-consent-1' })),
}));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

const mockNav = {
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
} as never;

const mockRoute = { key: 'test', name: 'TestRoute', params: undefined };

beforeEach(() => jest.clearAllMocks());

// ─── SplashScreen ─────────────────────────────────────────────────────────────

describe('SplashScreen', () => {
  it('renders TJBOT brand logo + tagline', () => {
    const { getByLabelText, getByText } = render(
      <SplashScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByLabelText('TJBot Future Tech')).toBeTruthy();
    expect(getByText('Voice English for kids')).toBeTruthy();
  });

  it('auto-navigates to WelcomeScreen after 1.7s', () => {
    jest.useFakeTimers();
    render(<SplashScreen navigation={mockNav} route={mockRoute as never} />);
    act(() => {
      jest.advanceTimersByTime(1700);
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.WelcomeScreen);
    jest.useRealTimers();
  });

  it('does not navigate before the 1.7s timer fires', () => {
    jest.useFakeTimers();
    render(<SplashScreen navigation={mockNav} route={mockRoute as never} />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

describe('WelcomeScreen', () => {
  it('renders hero + grown-up note + CTAs', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText(/Hi! I'm Robot/)).toBeTruthy();
    expect(getByText(/A grown-up sets things up/)).toBeTruthy();
    expect(getByText('Get started')).toBeTruthy();
    expect(getByText('I already have an account')).toBeTruthy();
  });

  it('navigates to IntroListenScreen when Get started pressed', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Get started'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroListenScreen);
  });

  it('navigates to LoginScreen when "I already have an account" pressed', () => {
    const { getByText } = render(
      <WelcomeScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('I already have an account'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LoginScreen);
  });
});

// ─── IntroListenScreen ───────────────────────────────────────────────────────

describe('IntroListenScreen', () => {
  it('renders kicker + title + body', () => {
    const { getByText } = render(
      <IntroListenScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('How it works · 1')).toBeTruthy();
    expect(getByText('Robot listens')).toBeTruthy();
    expect(getByText(/Kids tap the mic/)).toBeTruthy();
  });

  it('renders Next CTA + Skip', () => {
    const { getByText } = render(
      <IntroListenScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
  });

  it('navigates to IntroSpeakScreen when Next pressed', () => {
    const { getByText } = render(
      <IntroListenScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Next'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroSpeakScreen);
  });

  it('navigates to TrustScreen when Skip pressed', () => {
    const { getByText } = render(
      <IntroListenScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Skip'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
  });
});

// ─── IntroSpeakScreen ────────────────────────────────────────────────────────

describe('IntroSpeakScreen', () => {
  it('renders title', () => {
    const { getByText } = render(
      <IntroSpeakScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Robot speaks back')).toBeTruthy();
  });

  it('navigates to IntroRetryScreen when Next pressed', () => {
    const { getByText } = render(
      <IntroSpeakScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Next'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroRetryScreen);
  });
});

// ─── IntroRetryScreen ────────────────────────────────────────────────────────

describe('IntroRetryScreen', () => {
  it('renders title', () => {
    const { getByText } = render(
      <IntroRetryScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText("It's okay to try again")).toBeTruthy();
  });

  it('navigates to IntroCelebrateScreen when Next pressed', () => {
    const { getByText } = render(
      <IntroRetryScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Next'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroCelebrateScreen);
  });
});

// ─── IntroCelebrateScreen ────────────────────────────────────────────────────

describe('IntroCelebrateScreen', () => {
  it('renders title', () => {
    const { getByText } = render(
      <IntroCelebrateScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Small wins, every day')).toBeTruthy();
  });

  it('navigates to TrustScreen when Next pressed', () => {
    const { getByText } = render(
      <IntroCelebrateScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Next'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
  });
});

// ─── TrustScreen ─────────────────────────────────────────────────────────────

describe('TrustScreen', () => {
  it('renders all 4 trust promises', () => {
    const { getByText } = render(
      <TrustScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Voice stays in the lesson')).toBeTruthy();
    expect(getByText('Short, focused sessions')).toBeTruthy();
    expect(getByText('No social, no chat, no ads')).toBeTruthy();
    expect(getByText('You stay in control')).toBeTruthy();
  });

  it('navigates to MicAskScreen when Continue pressed', () => {
    const { getByText } = render(
      <TrustScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Continue'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MicAskScreen);
  });
});

// ─── MicAskScreen ────────────────────────────────────────────────────────────

describe('MicAskScreen', () => {
  it('renders Continue without a skip CTA', () => {
    const { getByText } = render(
      <MicAskScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Continue')).toBeTruthy();
    expect(() => getByText('Not now')).toThrow();
  });

  it('records AI voice consent before navigating to FirstLessonEntryScreen', async () => {
    const { getByText } = render(
      <MicAskScreen navigation={mockNav} route={mockRoute as never} />
    );
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });
    expect(authApi.recordAiVoiceConsent).toHaveBeenCalledWith({
      consent_version: 'ai-voice-google-v1',
      google_subprocessors_version: 'google-subprocessors-v1',
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.FirstLessonEntryScreen);
  });

  it('blocks onboarding when AI voice consent cannot be saved', async () => {
    jest.mocked(authApi.recordAiVoiceConsent).mockRejectedValueOnce(new Error('consent failed'));
    const { getByText, findByText } = render(
      <MicAskScreen navigation={mockNav} route={mockRoute as never} />
    );

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(await findByText('Consent must be saved before voice setup can continue.')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.FirstLessonEntryScreen);
  });
});

// ─── FirstLessonEntryScreen ──────────────────────────────────────────────────

describe('FirstLessonEntryScreen', () => {
  it('renders the first lesson plan from the approved blueprint', () => {
    const { getByText } = render(
      <FirstLessonEntryScreen navigation={mockNav} route={mockRoute as never} />
    );
    expect(getByText('Your first lesson is ready!')).toBeTruthy();
    expect(getByText('Hello, Farm!')).toBeTruthy();
    expect(getByText('4 words · 6 minutes')).toBeTruthy();
    expect(getByText('Start lesson')).toBeTruthy();
  });

  it('navigates to LessonReadyScreen when Start lesson is pressed', () => {
    const { getByText } = render(
      <FirstLessonEntryScreen navigation={mockNav} route={mockRoute as never} />
    );
    fireEvent.press(getByText('Start lesson'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LessonReadyScreen);
  });
});
