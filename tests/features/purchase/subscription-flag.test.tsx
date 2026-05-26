/**
 * AC-IAP — UI gate.
 *
 * Verifies that with `FEATURE_SUBSCRIPTION=false`:
 *   - SubscriptionsScreen renders a deferral placeholder; no Stripe call.
 *   - CheckoutScreen renders a deferral placeholder; no Stripe call.
 *   - BuyCourseScreen renders the free Course Library add affordance instead
 *     of billing CTA copy.
 */
jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
  FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
    readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
    constructor(operation: string) {
      super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
      this.name = 'FeatureSubscriptionDisabledError';
    }
  },
}));

jest.mock('@/services/api/purchase.api', () => ({
  __esModule: true,
  createCheckoutSession: jest.fn(),
  getOrder: jest.fn(),
  getShippingStatus: jest.fn(),
  getBillingProviderStatus: jest.fn(),
  listBillingPlans: jest.fn(),
  getCurrentBillingPlan: jest.fn(),
  getCurrentSubscription: jest.fn(),
  subscribeToPlan: jest.fn(),
  cancelSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  reactivateSubscription: jest.fn(),
  cancelOrder: jest.fn(),
  requestReturn: jest.fn(),
  activateRobot: jest.fn(),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import {
  cancelSubscription,
  createCheckoutSession,
  getBillingProviderStatus,
  getCurrentBillingPlan,
  getCurrentSubscription,
  listBillingPlans,
  pauseSubscription,
  reactivateSubscription,
  resumeSubscription,
  subscribeToPlan,
} from '@/services/api/purchase.api';
import SubscriptionsScreen from '@/features/purchase/screens/SubscriptionsScreen';
import CheckoutScreen from '@/features/purchase/screens/CheckoutScreen';
import BuyCourseScreen from '@/features/course-library/screens/BuyCourseScreen';

const mockedCreateCheckoutSession = createCheckoutSession as jest.MockedFunction<typeof createCheckoutSession>;
const mockedSubscribeToPlan = subscribeToPlan as jest.MockedFunction<typeof subscribeToPlan>;
const mockedCancelSubscription = cancelSubscription as jest.MockedFunction<typeof cancelSubscription>;
const mockedPauseSubscription = pauseSubscription as jest.MockedFunction<typeof pauseSubscription>;
const mockedResumeSubscription = resumeSubscription as jest.MockedFunction<typeof resumeSubscription>;
const mockedReactivateSubscription = reactivateSubscription as jest.MockedFunction<typeof reactivateSubscription>;
const mockedListBillingPlans = listBillingPlans as jest.MockedFunction<typeof listBillingPlans>;
const mockedGetBillingProviderStatus = getBillingProviderStatus as jest.MockedFunction<typeof getBillingProviderStatus>;
const mockedGetCurrentBillingPlan = getCurrentBillingPlan as jest.MockedFunction<typeof getCurrentBillingPlan>;
const mockedGetCurrentSubscription = getCurrentSubscription as jest.MockedFunction<typeof getCurrentSubscription>;

function navigationFor(): Record<string, jest.Mock> {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
  };
}

describe('FEATURE_SUBSCRIPTION=false UI gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SubscriptionsScreen renders deferral placeholder and never invokes Stripe', () => {
    const navigation = navigationFor();
    render(
      <SubscriptionsScreen
        navigation={navigation as never}
        route={{ key: 'subs', name: ROUTES.SubscriptionsScreen, params: { orderId: 'ord_x' } } as never}
      />,
    );

    expect(screen.getByTestId('subscriptionsDisabledPlaceholder')).toBeTruthy();
    expect(screen.getByText('Subscriptions return in v1.1')).toBeTruthy();

    expect(mockedSubscribeToPlan).not.toHaveBeenCalled();
    expect(mockedCancelSubscription).not.toHaveBeenCalled();
    expect(mockedPauseSubscription).not.toHaveBeenCalled();
    expect(mockedResumeSubscription).not.toHaveBeenCalled();
    expect(mockedReactivateSubscription).not.toHaveBeenCalled();
    expect(mockedListBillingPlans).not.toHaveBeenCalled();
    expect(mockedGetBillingProviderStatus).not.toHaveBeenCalled();
    expect(mockedGetCurrentBillingPlan).not.toHaveBeenCalled();
    expect(mockedGetCurrentSubscription).not.toHaveBeenCalled();
  });

  it('CheckoutScreen renders deferral placeholder and never invokes Stripe', () => {
    const navigation = navigationFor();
    render(
      <CheckoutScreen
        navigation={navigation as never}
        route={{ key: 'checkout', name: ROUTES.CheckoutScreen } as never}
      />,
    );

    expect(screen.getByTestId('checkoutDisabledPlaceholder')).toBeTruthy();
    expect(screen.getByText('Purchases return in v1.1')).toBeTruthy();
    expect(screen.queryByText('Place order · $149.00')).toBeNull();

    expect(mockedCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it('BuyCourseScreen renders the free Course Library add affordance instead of billing CTA copy', () => {
    const navigation = navigationFor();
    render(
      <BuyCourseScreen
        navigation={navigation as never}
        route={{ key: 'buy', name: ROUTES.BuyCourseScreen, params: { courseId: 'animals' } } as never}
      />,
    );

    expect(screen.getByTestId('buyCourseFreeMode')).toBeTruthy();
    expect(screen.getByText('Included for now')).toBeTruthy();
    expect(screen.queryByText('Confirm & continue')).toBeNull();
    expect(screen.queryByText('Choose a plan')).toBeNull();

    expect(mockedCreateCheckoutSession).not.toHaveBeenCalled();
  });
});
