import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AgeScreen from '../../src/navigation/AgeScreen';
import type { AgeAnswer, AgeBandId } from '../../src/features/onboarding/ageGate';
import type { UserRole } from '../../src/services/observability/analytics';

const mockWriteAgeAnswer = jest.fn(
  async (band: AgeBandId): Promise<AgeAnswer> => ({
    band,
    role: band === '13_17' ? 'teen' : 'adult',
    answeredAt: '2026-05-26T00:00:00.000Z',
  }),
);
const mockSetAnalyticsUserRole = jest.fn<void, [UserRole]>();
const mockInitAnalytics = jest.fn<void, [UserRole?]>();
const mockIsAnalyticsEnabled = jest.fn(() => true);
const mockSetSentryUserRole = jest.fn<void, [UserRole | 'unknown']>();
const mockCaptureError = jest.fn<void, [unknown]>();

jest.mock('../../src/features/onboarding/ageGate', () => ({
  writeAgeAnswer: (band: AgeBandId) => mockWriteAgeAnswer(band),
}));

jest.mock('../../src/services/observability/analytics', () => ({
  setAnalyticsUserRole: (role: UserRole) => mockSetAnalyticsUserRole(role),
  initAnalytics: (role?: UserRole) => mockInitAnalytics(role),
  isAnalyticsEnabled: () => mockIsAnalyticsEnabled(),
}));

jest.mock('../../src/services/observability/sentry', () => ({
  setSentryUserRole: (role: UserRole | 'unknown') => mockSetSentryUserRole(role),
  captureError: (error: unknown) => mockCaptureError(error),
}));

describe('AgeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAnalyticsEnabled.mockReturnValue(true);
  });

  it('completes after the age answer is saved even when analytics role update fails', async () => {
    mockSetAnalyticsUserRole.mockImplementationOnce(() => {
      throw new Error('posthog unavailable');
    });
    const onComplete = jest.fn<void, [AgeAnswer]>();

    const screen = render(<AgeScreen onComplete={onComplete} />);
    fireEvent.press(screen.getByTestId('ageBandOption_13_17'));
    fireEvent.press(screen.getByTestId('ageScreenContinueButton'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ band: '13_17', role: 'teen' }),
      );
    });
    expect(mockCaptureError).toHaveBeenCalledWith(expect.any(Error));
    expect(screen.queryByText('We could not save your answer. Please try again.')).toBeNull();
  });

  it('shows the save error only when persisting the answer fails', async () => {
    mockWriteAgeAnswer.mockRejectedValueOnce(new Error('keychain locked'));
    const onComplete = jest.fn<void, [AgeAnswer]>();

    const screen = render(<AgeScreen onComplete={onComplete} />);
    fireEvent.press(screen.getByTestId('ageBandOption_13_17'));
    fireEvent.press(screen.getByTestId('ageScreenContinueButton'));

    expect(await screen.findByText('We could not save your answer. Please try again.')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
