import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import IntroListenScreen from '../../../src/features/auth/screens/IntroListenScreen';
import IntroSpeakScreen from '../../../src/features/auth/screens/IntroSpeakScreen';
import IntroRetryScreen from '../../../src/features/auth/screens/IntroRetryScreen';
import TrustScreen from '../../../src/features/auth/screens/TrustScreen';
import { ROUTES } from '../../../src/navigation/routes';
import { resources } from '../../../src/services/i18n/resources';
import { setAppLanguage } from '../../../src/services/i18n/i18n';

const mockNavigate = jest.fn();
const mockNav = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as never;

const INTRO_COPY = [
  'Learn through play',
  'TeeBot guides your child step by step, helping them speak English with confidence.',
  'Start learning with TeeBot',
  'Skip',
  'Step 1/3',
  'Explore TeeBot',
  'No tests, no pressure — just joy.',
  'Continue',
  '2/3',
  'Parents are always alongside',
  'See what your child learned each week, right on your phone.',
  "Create your child's profile",
  'Step 3/3',
] as const;

const TRUST_COPY = [
  'Privacy & trust',
  'Safe for your child, peace of mind for parents',
  'No ads',
  'A clean environment, never interrupted by advertising.',
  'Protected data',
  "Your child's personal information is encrypted and protected.",
  'Content for ages 4–6',
  "Every lesson is designed specifically for your child's age.",
  'I understand, continue',
  'Step 2/3',
] as const;

function localeHasCopy(locale: 'en' | 'vi', copy: string): boolean {
  return Object.hasOwn(resources[locale].translation, copy);
}

describe('Intro walkthrough blueprint', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('has English and Vietnamese catalog keys for every static intro string', () => {
    for (const copy of INTRO_COPY) {
      expect(localeHasCopy('en', copy)).toBe(true);
      expect(localeHasCopy('vi', copy)).toBe(true);
    }
  });

  it('has English and Vietnamese catalog keys for every trust promise', () => {
    for (const copy of TRUST_COPY) {
      expect(localeHasCopy('en', copy)).toBe(true);
      expect(localeHasCopy('vi', copy)).toBe(true);
    }
  });

  it('renders the Vietnamese trust blueprint and continues to sign in', async () => {
    await setAppLanguage('vi');

    const screen = render(
      <TrustScreen
        navigation={mockNav}
        route={{ key: 'trust', name: 'TrustScreen', params: undefined } as never}
      />,
    );

    expect(screen.getByText('An toàn cho con, an tâm cho ba mẹ')).toBeTruthy();
    expect(screen.getByText('Không quảng cáo')).toBeTruthy();
    expect(screen.getByText('Dữ liệu được bảo vệ')).toBeTruthy();
    expect(screen.getByText('Nội dung 4–6 tuổi')).toBeTruthy();
    expect(screen.getByText('Bước 2/3')).toBeTruthy();
    expect(screen.queryByText('Voice stays in the lesson')).toBeNull();

    fireEvent.press(screen.getByTestId('trustContinueButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LoginScreen);
  });

  it('renders all three Vietnamese blueprint states without mixed English copy', async () => {
    await setAppLanguage('vi');

    const first = render(
      <IntroListenScreen
        navigation={mockNav}
        route={{ key: 'intro-1', name: 'IntroListenScreen', params: undefined } as never}
      />,
    );
    expect(first.getByText('Học qua trò chơi')).toBeTruthy();
    expect(first.getByText('TeeBot sẽ hướng dẫn con từng bước, giúp con nói tiếng Anh tự tin.')).toBeTruthy();
    expect(first.getByText('Bắt đầu học với TeeBot')).toBeTruthy();
    expect(first.getByText('Bước 1/3')).toBeTruthy();
    expect(first.queryByText('Learn through play')).toBeNull();
    first.unmount();

    const second = render(
      <IntroSpeakScreen
        navigation={mockNav}
        route={{ key: 'intro-2', name: 'IntroSpeakScreen', params: undefined } as never}
      />,
    );
    expect(second.getByText('Khám phá TeeBot')).toBeTruthy();
    expect(second.getByText('Học qua trò chơi')).toBeTruthy();
    expect(second.getByText('Không bài kiểm tra, không áp lực — chỉ có niềm vui.')).toBeTruthy();
    expect(second.getByText('Tiếp tục')).toBeTruthy();
    second.unmount();

    const third = render(
      <IntroRetryScreen
        navigation={mockNav}
        route={{ key: 'intro-3', name: 'IntroRetryScreen', params: undefined } as never}
      />,
    );
    expect(third.getByText('Ba mẹ luôn đồng hành')).toBeTruthy();
    expect(third.getByText('Xem con học được gì mỗi tuần, ngay trên điện thoại.')).toBeTruthy();
    expect(third.getByText('Tạo hồ sơ cho bé')).toBeTruthy();
    expect(third.getByText('Bước 3/3')).toBeTruthy();
  });

  it('keeps next, back, and skip actions connected across the three-step flow', async () => {
    await setAppLanguage('en');

    const first = render(
      <IntroListenScreen
        navigation={mockNav}
        route={{ key: 'intro-1', name: 'IntroListenScreen', params: undefined } as never}
      />,
    );
    fireEvent.press(first.getByTestId('introNextButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroSpeakScreen);
    fireEvent.press(first.getByTestId('introSkipButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
    first.unmount();

    const second = render(
      <IntroSpeakScreen
        navigation={mockNav}
        route={{ key: 'intro-2', name: 'IntroSpeakScreen', params: undefined } as never}
      />,
    );
    fireEvent.press(second.getByTestId('introBackButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroListenScreen);
    fireEvent.press(second.getByTestId('introNextButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroRetryScreen);
    fireEvent.press(second.getByTestId('introSkipButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
    second.unmount();

    const third = render(
      <IntroRetryScreen
        navigation={mockNav}
        route={{ key: 'intro-3', name: 'IntroRetryScreen', params: undefined } as never}
      />,
    );
    fireEvent.press(third.getByTestId('introNextButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
    fireEvent.press(third.getByTestId('introSkipButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TrustScreen);
  });
});
