import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: true,
  isSubscriptionFeatureEnabled: () => true,
  FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
  FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
    readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
    constructor(operation: string) {
      super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
      this.name = 'FeatureSubscriptionDisabledError';
    }
  },
}));
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';
import {
  cancelOrder,
  cancelSubscription,
  createCheckoutSession,
  getBillingProviderStatus,
  getCurrentBillingPlan,
  getCurrentSubscription,
  getOrder,
  getShippingStatus,
  listBillingPlans,
  pauseSubscription,
  reactivateSubscription,
  requestReturn,
  resumeSubscription,
  subscribeToPlan,
} from '@/services/api/purchase.api';
import CheckoutScreen from '@/features/purchase/screens/CheckoutScreen';
import BundleScreen from '@/features/purchase/screens/BundleScreen';
import OrderConfirmScreen from '@/features/purchase/screens/OrderConfirmScreen';
import ShippingScreen from '@/features/purchase/screens/ShippingScreen';
import SubscriptionsScreen from '@/features/purchase/screens/SubscriptionsScreen';
import ArrivedScreen from '@/features/purchase/screens/ArrivedScreen';
import ActivateScreen from '@/features/purchase/screens/ActivateScreen';
import PurchaseIntroScreen from '@/features/purchase/screens/PurchaseIntroScreen';

jest.setTimeout(120_000);

jest.mock('@/services/api/purchase.api', () => ({
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

jest.mock('@/services/api/account', () => ({
  refreshEntitlementsAfterPurchase: jest.fn(),
}));

const mockedCreateCheckoutSession = createCheckoutSession as jest.MockedFunction<typeof createCheckoutSession>;
const mockedGetOrder = getOrder as jest.MockedFunction<typeof getOrder>;
const mockedGetShippingStatus = getShippingStatus as jest.MockedFunction<typeof getShippingStatus>;
const mockedGetBillingProviderStatus = getBillingProviderStatus as jest.MockedFunction<typeof getBillingProviderStatus>;
const mockedListBillingPlans = listBillingPlans as jest.MockedFunction<typeof listBillingPlans>;
const mockedGetCurrentBillingPlan = getCurrentBillingPlan as jest.MockedFunction<typeof getCurrentBillingPlan>;
const mockedGetCurrentSubscription = getCurrentSubscription as jest.MockedFunction<typeof getCurrentSubscription>;
const mockedSubscribeToPlan = subscribeToPlan as jest.MockedFunction<typeof subscribeToPlan>;
const mockedCancelSubscription = cancelSubscription as jest.MockedFunction<typeof cancelSubscription>;
const mockedPauseSubscription = pauseSubscription as jest.MockedFunction<typeof pauseSubscription>;
const mockedResumeSubscription = resumeSubscription as jest.MockedFunction<typeof resumeSubscription>;
const mockedReactivateSubscription = reactivateSubscription as jest.MockedFunction<typeof reactivateSubscription>;
const mockedCancelOrder = cancelOrder as jest.MockedFunction<typeof cancelOrder>;
const mockedRequestReturn = requestReturn as jest.MockedFunction<typeof requestReturn>;
const mockedRefreshEntitlements = refreshEntitlementsAfterPurchase as jest.MockedFunction<typeof refreshEntitlementsAfterPurchase>;

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: Error) => void } {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function navigationFor() {
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

describe('purchase billing screens', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockedListBillingPlans.mockResolvedValue([]);
    mockedGetCurrentBillingPlan.mockResolvedValue(null);
    mockedGetCurrentSubscription.mockResolvedValue(null);
  });

  it('exposes selected state for bundle choices without urgency cues', () => {
    const navigation = navigationFor();
    render(<BundleScreen navigation={navigation as never} route={{ key: 'bundle', name: ROUTES.BundleScreen } as never} />);

    expect(screen.getByLabelText('Select Robot + Hello Friends bundle').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText('Select Robot + All Courses (1 year) bundle').props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(screen.getByLabelText('Select Robot + All Courses (1 year) bundle'));

    expect(screen.getByLabelText('Select Robot + Hello Friends bundle').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByLabelText('Select Robot + All Courses (1 year) bundle').props.accessibilityState).toEqual({ selected: true });
  });

  it('renders purchase intro CTA in the scroll surface and routes to how-it-works', () => {
    const navigation = navigationFor();
    const screen = render(
      <PurchaseIntroScreen
        navigation={navigation as never}
        route={{ key: 'purchase-intro', name: ROUTES.PurchaseIntroScreen } as never}
      />,
    );

    const scroll = screen.getByTestId('purchaseIntroScroll');
    const cta = screen.getByTestId('purchaseIntroHowItWorksCta');

    expect(scroll).toBeTruthy();
    expect(cta.props.accessibilityRole).toBe('button');
    expect(cta.props.accessibilityLabel).toBe('See how it works');
    expect(cta.props.accessibilityState?.disabled).toBeUndefined();

    fireEvent.press(cta);

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HowItWorksScreen);
  });

  it('blocks checkout when saved shipping profile is missing', async () => {
    const navigation = navigationFor();
    render(<CheckoutScreen navigation={navigation as never} route={{ key: 'checkout', name: ROUTES.CheckoutScreen } as never} />);

    fireEvent.press(screen.getByText('Place order · $149.00'));

    await screen.findByText('Shipping profile is missing. Add a saved address before checkout.');
    expect(mockedCreateCheckoutSession).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not advertise a verified shipping profile when checkout draft is missing', () => {
    const navigation = navigationFor();
    render(<CheckoutScreen navigation={navigation as never} route={{ key: 'checkout', name: ROUTES.CheckoutScreen } as never} />);

    expect(screen.getByText('Missing')).toBeTruthy();
    expect(screen.getByText('Add a saved shipping address before checkout')).toBeTruthy();
  });

  it('does not show order confirmation before payment completion', async () => {
    const navigation = navigationFor();
    render(<CheckoutScreen navigation={navigation as never} route={{ key: 'checkout', name: ROUTES.CheckoutScreen } as never} />);

    fireEvent.press(screen.getByText('Place order · $149.00'));

    await screen.findByText('Shipping profile is missing. Add a saved address before checkout.');
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.OrderConfirmScreen, expect.anything());
  });

  it('shows order loading, error, retry, success, and refreshes entitlements once for paid order', async () => {
    mockedGetOrder
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        id: 'ord_123',
        status: 'paid',
        productId: 'robot-hello-friends-bundle',
        totalCents: 14900,
        receiptEmail: 'parent@example.com',
      });
    mockedRefreshEntitlements.mockResolvedValue({
      courses: ['hello-friends'],
      subscriptionStatus: 'active',
      robotActivated: true,
    });
    const navigation = navigationFor();
    render(
      <OrderConfirmScreen
        navigation={navigation as never}
        route={{ key: 'confirm', name: ROUTES.OrderConfirmScreen, params: { orderId: 'ord_123' } } as never}
      />,
    );

    expect(screen.getByText('Loading order...')).toBeTruthy();
    await screen.findByText('Order needs a retry');

    fireEvent.press(screen.getByText('Retry order status'));

    await screen.findByText('Order confirmed');
    expect(mockedGetOrder).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(mockedRefreshEntitlements).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a recovery state when order confirmation has no order id', () => {
    const navigation = navigationFor();
    render(
      <OrderConfirmScreen
        navigation={navigation as never}
        route={{ key: 'confirm', name: ROUTES.OrderConfirmScreen } as never}
      />,
    );

    expect(screen.getByText('Order link is missing')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to checkout'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CheckoutScreen);
  });

  it('does not show delivery actions for unpaid orders', async () => {
    mockedGetOrder.mockResolvedValueOnce({
      id: 'ord_pending',
      status: 'pending_payment',
      productId: 'robot-hello-friends-bundle',
      totalCents: 14900,
      receiptEmail: null,
    });
    const navigation = navigationFor();
    render(
      <OrderConfirmScreen
        navigation={navigation as never}
        route={{ key: 'confirm', name: ROUTES.OrderConfirmScreen, params: { orderId: 'ord_pending' } } as never}
      />,
    );

    await screen.findByText('Payment not complete');
    expect(screen.queryByText('Track delivery')).toBeNull();
    expect(mockedRefreshEntitlements).not.toHaveBeenCalled();
  });

  it('shows shipping loading, error, retry, and success state', async () => {
    mockedGetShippingStatus
      .mockRejectedValueOnce(new Error('carrier down'))
      .mockResolvedValueOnce({
        orderId: 'ord_123',
        status: 'out_for_delivery',
        estimatedDelivery: '2026-05-18',
        trackingNumber: '1Z999',
      });
    const navigation = navigationFor();
    render(
      <ShippingScreen
        navigation={navigation as never}
        route={{ key: 'shipping', name: ROUTES.ShippingScreen, params: { orderId: 'ord_123' } } as never}
      />,
    );

    expect(screen.getByText('Loading shipping...')).toBeTruthy();
    await screen.findByText('Shipping needs a retry');

    fireEvent.press(screen.getByText('Retry shipping status'));

    await screen.findByText('Arriving 2026-05-18');
    expect(screen.getByText('Carrier 1Z999')).toBeTruthy();
    expect(screen.queryByText('Robot has arrived')).toBeNull();
    expect(mockedGetShippingStatus).toHaveBeenCalledTimes(2);
  });

  it('shows a recovery state when shipping has no order id', () => {
    const navigation = navigationFor();
    render(
      <ShippingScreen
        navigation={navigation as never}
        route={{ key: 'shipping', name: ROUTES.ShippingScreen } as never}
      />,
    );

    expect(screen.getByText('Tracking link is missing')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to order'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.OrderConfirmScreen);
  });

  it('requires order id before arrival setup', () => {
    const navigation = navigationFor();
    render(
      <ArrivedScreen
        navigation={navigation as never}
        route={{ key: 'arrived', name: ROUTES.ArrivedScreen } as never}
      />,
    );

    expect(screen.getByText('Delivery link is missing')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to tracking'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ShippingScreen);
  });

  it('shows provider unavailable state for subscription, cancel, and refund UI', async () => {
    mockedGetBillingProviderStatus.mockResolvedValueOnce({
      providerAvailable: false,
      message: 'Stripe maintenance',
    });
    const navigation = navigationFor();
    render(<SubscriptionsScreen navigation={navigation as never} route={{ key: 'subs', name: ROUTES.SubscriptionsScreen } as never} />);

    await screen.findByText('Billing provider unavailable');
    expect(screen.getByText('Stripe maintenance')).toBeTruthy();
    expect(screen.getByText('Cancel order unavailable')).toBeTruthy();
    expect(screen.getByText('Refund request unavailable')).toBeTruthy();
  });

  it('loads backend plans and current subscription before creating a subscription checkout', async () => {
    mockedGetBillingProviderStatus.mockResolvedValueOnce({
      providerAvailable: true,
      message: null,
    });
    mockedListBillingPlans.mockResolvedValueOnce([
      {
        id: 'plan_all_courses_monthly',
        name: 'All Courses',
        amountCents: 899,
        currency: 'usd',
        interval: 'month',
        trialDays: 7,
      },
    ]);
    mockedGetCurrentBillingPlan.mockResolvedValueOnce({
      id: 'plan_free',
      name: 'Hello Friends',
      amountCents: 0,
      currency: 'usd',
      interval: null,
      trialDays: null,
    });
    mockedGetCurrentSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_free',
      status: 'none',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    mockedSubscribeToPlan.mockResolvedValueOnce({
      orderId: 'ord_sub_123',
      stripeCheckoutUrl: 'https://checkout.stripe.test/subscription',
      expiresAt: null,
      state: 'pending_payment',
    });

    const navigation = navigationFor();
    render(<SubscriptionsScreen navigation={navigation as never} route={{ key: 'subs', name: ROUTES.SubscriptionsScreen } as never} />);

    await screen.findByText('Current plan: Hello Friends');
    await screen.findByText('Subscription status: none');
    await screen.findByText('All Courses');

    fireEvent.press(screen.getByLabelText('Choose All Courses subscription'));
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mockedSubscribeToPlan).toHaveBeenCalledWith('plan_all_courses_monthly', expect.stringMatching(/^subscribe-/));
    });
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.OrderConfirmScreen, { orderId: 'ord_sub_123' });
    expect(screen.getByText('Subscription payment is not complete yet. Finish checkout before confirmation.')).toBeTruthy();
  });

  it('prevents duplicate activation submits and preserves order context on back', async () => {
    const activation = deferred<void>();
    const { activateRobot } = jest.requireMock('@/services/api/purchase.api') as { activateRobot: jest.Mock };
    activateRobot.mockReturnValueOnce(activation.promise);
    const navigation = navigationFor();
    render(
      <ActivateScreen
        navigation={navigation as never}
        route={{ key: 'activate', name: ROUTES.ActivateScreen, params: { orderId: 'ord_123' } } as never}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Activation code'), 'abc123');
    await act(async () => {
      fireEvent.press(screen.getByText('Activate Robot'));
    });
    fireEvent.press(screen.getByText('Activating Robot...'));

    expect(activateRobot).toHaveBeenCalledTimes(1);
    expect(activateRobot).toHaveBeenCalledWith('ABC123');

    fireEvent.press(screen.getByText('Activating Robot...'));
    expect(activateRobot).toHaveBeenCalledTimes(1);

    activation.resolve(undefined);
    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.FirstCourseScreen, { orderId: 'ord_123' });
    });
  });

  it('runs subscription lifecycle mutations from backend state and refreshes visible status', async () => {
    mockedGetBillingProviderStatus.mockResolvedValueOnce({
      providerAvailable: true,
      message: null,
    });
    mockedGetCurrentSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_all_courses_monthly',
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    mockedCancelSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_all_courses_monthly',
      status: 'active',
      currentPeriodEnd: '2026-06-16T00:00:00Z',
      cancelAtPeriodEnd: true,
    });
    mockedPauseSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_all_courses_monthly',
      status: 'paused',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    mockedResumeSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_all_courses_monthly',
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    mockedReactivateSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      planId: 'plan_all_courses_monthly',
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });

    const navigation = navigationFor();
    render(<SubscriptionsScreen navigation={navigation as never} route={{ key: 'subs', name: ROUTES.SubscriptionsScreen } as never} />);

    await screen.findByText('Subscription status: active');

    fireEvent.press(screen.getByText('Cancel subscription'));
    await screen.findByText('Subscription change saved.');
    expect(mockedCancelSubscription).toHaveBeenCalledWith(expect.stringMatching(/^sub-cancel-/));
    await screen.findByText('Renews until Jun 16, 2026');

    fireEvent.press(screen.getByText('Reactivate subscription'));
    expect(mockedReactivateSubscription).toHaveBeenCalledWith(expect.stringMatching(/^sub-reactivate-/));
    await waitFor(() => expect(screen.queryByText('Updating subscription...')).toBeNull(), { timeout: 15000 });

    fireEvent.press(screen.getByText('Pause subscription'));
    await screen.findByText('Subscription status: paused');
    expect(mockedPauseSubscription).toHaveBeenCalledWith(expect.stringMatching(/^sub-pause-/));

    fireEvent.press(screen.getByText('Resume subscription'));
    await screen.findByText('Subscription status: active');
    expect(mockedResumeSubscription).toHaveBeenCalledWith(expect.stringMatching(/^sub-resume-/));
  });

  it('prevents duplicate cancel and refund submits', async () => {
    mockedGetBillingProviderStatus.mockResolvedValueOnce({
      providerAvailable: true,
      message: null,
    });
    const cancel = deferred<Awaited<ReturnType<typeof cancelOrder>>>();
    const refund = deferred<Awaited<ReturnType<typeof requestReturn>>>();
    mockedCancelOrder.mockReturnValue(cancel.promise);
    mockedRequestReturn.mockReturnValue(refund.promise);
    const navigation = navigationFor();
    render(
      <SubscriptionsScreen
        navigation={navigation as never}
        route={{ key: 'subs', name: ROUTES.SubscriptionsScreen, params: { orderId: 'ord_123' } } as never}
      />,
    );

    await screen.findByText('Manage billing');
    fireEvent.press(screen.getByText('Cancel pending order'));
    fireEvent.press(screen.getByText('Cancelling order...'));
    expect(mockedCancelOrder).toHaveBeenCalledTimes(1);
    expect(mockedCancelOrder).toHaveBeenCalledWith('ord_123', expect.stringMatching(/^cancel-/));

    cancel.resolve({ orderId: 'ord_123', state: 'cancelled', cancelledAt: '2026-05-14T10:00:00Z' });
    await screen.findByText('Order cancelled.');

    fireEvent.press(screen.getByText('Request refund review'));
    fireEvent.press(screen.getByText('Submitting refund...'));
    expect(mockedRequestReturn).toHaveBeenCalledTimes(1);
    expect(mockedRequestReturn).toHaveBeenCalledWith(
      'ord_123',
      'parent_requested',
      'Requested from mobile billing settings.',
      expect.stringMatching(/^refund-/),
    );

    refund.resolve({
      requestId: 'ret_123',
      state: 'pending_admin_review',
      expectedDecisionBy: '2026-05-16T10:00:00Z',
    });
    await screen.findByText('Refund request submitted.');
  });

  it('does not expose cancel or refund actions without an owned order id', async () => {
    mockedGetBillingProviderStatus.mockResolvedValueOnce({
      providerAvailable: true,
      message: null,
    });
    const navigation = navigationFor();
    render(<SubscriptionsScreen navigation={navigation as never} route={{ key: 'subs', name: ROUTES.SubscriptionsScreen } as never} />);

    await screen.findByText('Manage billing');
    expect(screen.getByText('No pending order to manage')).toBeTruthy();
    expect(screen.queryByText('Cancel pending order')).toBeNull();
    expect(screen.queryByText('Request refund review')).toBeNull();
  });
});
