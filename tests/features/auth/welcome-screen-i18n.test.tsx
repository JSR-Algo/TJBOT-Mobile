import React from 'react';
import { render } from '@testing-library/react-native';
import WelcomeScreen from '../../../src/features/auth/screens/WelcomeScreen';
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
const mockRoute = { key: 'welcome', name: 'WelcomeScreen', params: undefined } as never;

const WELCOME_COPY = [
  "Hi! I'm Tee.",
  'I help kids talk in English.',
  'A gentle voice buddy for ages 6–10.',
  'A grown-up sets things up the first time.',
  'Get started',
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

    expect(getByText(/Chào con! Mình là Tee/)).toBeTruthy();
    expect(getByText(/Mình giúp các bé nói tiếng Anh/)).toBeTruthy();
    expect(getByText(/Bạn đồng hành nói chuyện nhẹ nhàng cho bé 6–10 tuổi/)).toBeTruthy();
    expect(getByText(/Người lớn sẽ cài đặt giúp bé lần đầu/)).toBeTruthy();

    // Mixed-language regression: English source must not remain visible.
    expect(queryByText(/Hi! I'm Tee/)).toBeNull();
    expect(queryByText(/A gentle voice buddy/)).toBeNull();
  });
});
