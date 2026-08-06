import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WelcomeScreen from '../../../src/features/auth/screens/WelcomeScreen';
import { resources } from '../../../src/services/i18n/resources';
import { setAppLanguage } from '../../../src/services/i18n/i18n';
import { ROUTES } from '../../../src/navigation/routes';

const mockNavigate = jest.fn();
const mockNav = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as never;
const mockRoute = { key: 'welcome', name: 'WelcomeScreen', params: undefined } as never;

const WELCOME_COPY = [
  "Hello! I'm Tee.",
  "Let's learn English together!",
  "A little every day, and you'll speak English fluently.",
  'Get started',
  'Already have an account? Sign in',
] as const;

function localeHasCopy(locale: 'en' | 'vi', copy: string): boolean {
  return Object.hasOwn(resources[locale].translation, copy);
}

describe('WelcomeScreen i18n', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('has English and Vietnamese catalog keys for every static Welcome string', () => {
    for (const copy of WELCOME_COPY) {
      expect(localeHasCopy('en', copy)).toBe(true);
      expect(localeHasCopy('vi', copy)).toBe(true);
    }
  });

  it('renders Vietnamese Welcome copy when the app language is vi', async () => {
    await setAppLanguage('vi');

    const { getByText, queryByText } = render(
      <WelcomeScreen navigation={mockNav} route={mockRoute} />,
    );

    expect(getByText(/Xin chào! Mình là Tee/)).toBeTruthy();
    expect(getByText(/Cùng nhau học tiếng Anh nào/)).toBeTruthy();
    expect(getByText(/Mỗi ngày một chút, con sẽ nói tiếng Anh lưu loát/)).toBeTruthy();
    expect(getByText('Bắt đầu')).toBeTruthy();
    expect(getByText('Đã có tài khoản? Đăng nhập')).toBeTruthy();

    // Mixed-language regression: English source must not remain visible.
    expect(queryByText(/Hello! I'm Tee/)).toBeNull();
    expect(queryByText(/Let's learn English together/)).toBeNull();
  });

  it('keeps both blueprint actions connected to onboarding and sign-in', async () => {
    await setAppLanguage('en');
    const { getByTestId } = render(
      <WelcomeScreen navigation={mockNav} route={mockRoute} />,
    );

    fireEvent.press(getByTestId('getStartedButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.IntroListenScreen);

    fireEvent.press(getByTestId('signInButton'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LoginScreen);
  });
});
