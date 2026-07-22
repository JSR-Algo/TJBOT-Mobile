import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ParentConsentScreen from '../../../src/features/onboarding/screens/ParentConsentScreen';
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
const mockRoute = { key: 'consent', name: 'ParentConsentScreen', params: undefined } as never;

jest.mock('../../../src/services/http/tokens', () => ({
  getAccessToken: jest.fn(async () => 'test-access-token'),
}));

jest.mock('../../../src/services/api/account', () => ({
  isCoppaVerified: jest.fn(async () => false),
}));

jest.mock('../../../src/services/api/auth', () => ({
  sendConsent: jest.fn(async () => undefined),
}));

const CONSENT_COPY = [
  'Parent consent',
  'Parent signature needed',
  'A grown-up must consent before Robot can create a child profile or start voice lessons.',
  'I am the parent or legal guardian setting up this account.',
  'I consent to TJBot creating a child learning profile and using voice during lessons.',
  'I understand child settings and privacy controls stay in Parent Space.',
  'PARENT OR GUARDIAN NAME',
  'Type your full name',
  'I give parent consent for this child learning profile and voice lesson experience.',
  'Type your name (2+ characters) and check the consent box to enable Sign and continue.',
  'Sign and continue',
  'Recording consent...',
  'Checking consent...',
] as const;

function localeHasCopy(locale: 'en' | 'vi', copy: string): boolean {
  return Object.hasOwn(resources[locale].translation, copy);
}

describe('ParentConsentScreen i18n and checkbox', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('has English and Vietnamese catalog keys for every static consent string', () => {
    for (const copy of CONSENT_COPY) {
      expect(localeHasCopy('en', copy)).toBe(true);
      expect(localeHasCopy('vi', copy)).toBe(true);
    }
  });

  it('renders Vietnamese consent statements and CTA when language is vi', async () => {
    await setAppLanguage('vi');

    const { findByText, getByText, queryByText, getByTestId } = render(
      <ParentConsentScreen navigation={mockNav} route={mockRoute} />,
    );

    expect(await findByText(/Tôi là phụ huynh hoặc người giám hộ hợp pháp/)).toBeTruthy();
    expect(await findByText(/Tôi đồng ý cho TJBot tạo hồ sơ học tập/)).toBeTruthy();
    expect(await findByText(/cài đặt trẻ em và kiểm soát riêng tư/)).toBeTruthy();

    // Wait for the async COPPA status check to finish so the CTA settles.
    await waitFor(() => {
      expect(queryByText('Đang kiểm tra đồng ý...')).toBeNull();
      expect(getByTestId('parentConsentSubmitButton')).toBeTruthy();
      expect(getByText('Ký và tiếp tục')).toBeTruthy();
    });

    // Mixed-language regression: English source must not remain visible.
    expect(queryByText(/I am the parent or legal guardian/)).toBeNull();
    expect(queryByText(/^Sign and continue$/)).toBeNull();
  });

  it('exposes checked testID after the consent checkbox is tapped', async () => {
    await setAppLanguage('en');

    const { getByTestId, queryByTestId, findByTestId } = render(
      <ParentConsentScreen navigation={mockNav} route={mockRoute} />,
    );

    await findByTestId('parentConsentCheckbox_unchecked');
    fireEvent.changeText(getByTestId('parentConsentNameInput'), 'Home Parent');
    fireEvent.press(getByTestId('parentConsentCheckbox'));

    await waitFor(() => {
      expect(getByTestId('parentConsentCheckbox_checked')).toBeTruthy();
    });
    expect(queryByTestId('parentConsentCheckbox_unchecked')).toBeNull();
  });
});
