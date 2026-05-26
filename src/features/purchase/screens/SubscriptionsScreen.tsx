import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';
import { isSubscriptionFeatureEnabled } from '@/config/feature-flags';
import { ROUTES } from '@/navigation/routes';
import {
  cancelOrder,
  cancelSubscription,
  getBillingProviderStatus,
  getCurrentBillingPlan,
  getCurrentSubscription,
  listBillingPlans,
  pauseSubscription,
  reactivateSubscription,
  requestReturn,
  resumeSubscription,
  subscribeToPlan,
  type BillingPlan,
  type Subscription,
} from '@/services/api/purchase.api';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionsScreen'>;

const OPTS = [
  { id: 'none', tag: 'No subscription', body: "Stick with Hello Friends. You can add courses one at a time later.", price: 'Free', sub: 'Always an option' },
  { id: 'all',  tag: 'All Courses',     body: 'Every course on your Robot, including new ones we add.',             price: '$8.99', sub: '/ month · 7-day free trial' },
  { id: 'pack', tag: 'Starter pack',    body: 'Hello Friends, Animals, Yummy Words — once, yours forever.',         price: '$48',   sub: 'one-time · save $24' },
] as const;

export default function SubscriptionsScreen({ navigation, route }: Props) {
  const [pick, setPick] = React.useState<'none' | 'all' | 'pack'>('none');
  const [plans, setPlans] = React.useState<BillingPlan[]>([]);
  const [currentPlan, setCurrentPlan] = React.useState<BillingPlan | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [providerUnavailable, setProviderUnavailable] = React.useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = React.useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState(false);
  const [cancelPending, setCancelPending] = React.useState(false);
  const [refundPending, setRefundPending] = React.useState(false);
  const orderId = route.params?.orderId;

  React.useEffect(() => {
    if (!isSubscriptionFeatureEnabled()) {
      return;
    }
    let mounted = true;
    async function loadBilling(): Promise<void> {
      const provider = await getBillingProviderStatus();
      if (!mounted) {
        return;
      }
      if (!provider.providerAvailable) {
        setProviderUnavailable(provider.message ?? 'Billing is temporarily unavailable.');
        return;
      }
      const [nextPlans, nextPlan, nextSubscription] = await Promise.all([
        listBillingPlans(),
        getCurrentBillingPlan(),
        getCurrentSubscription(),
      ]);
      if (!mounted) {
        return;
      }
      setPlans(nextPlans);
      setCurrentPlan(nextPlan);
      setSubscription(nextSubscription);
    }
    void loadBilling();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isSubscriptionFeatureEnabled()) {
    return (
      <DeviceShell title="Add courses?" onBack={() => navigation.navigate(ROUTES.BundleScreen)}>
        <Box testID="subscriptionsDisabledPlaceholder" paddingHorizontal={24} paddingTop={40}>
          <Text fontWeight="700" style={styles.heading}>Subscriptions return in v1.1</Text>
          <Text style={styles.sub}>Course subscriptions are paused in this build.</Text>
        </Box>
      </DeviceShell>
    );
  }

  const selectedPlan = plans.find((plan) => plan.name === 'All Courses') ?? plans[0] ?? null;

  const handleContinue = async (): Promise<void> => {
    if (pick !== 'all' || !selectedPlan) {
      navigation.navigate(ROUTES.PrivacyScreen);
      return;
    }
    const session = await subscribeToPlan(selectedPlan.id, `subscribe-${Date.now()}`);
    if (session.state === 'paid' && session.orderId) {
      navigation.navigate(ROUTES.OrderConfirmScreen, { orderId: session.orderId });
      return;
    }
    setPaymentMessage('Subscription payment is not complete yet. Finish checkout before confirmation.');
  };

  const runSubscriptionMutation = async (
    prefix: string,
    mutate: (requestId: string) => Promise<Subscription>,
  ): Promise<void> => {
    if (updating) {
      return;
    }
    setUpdating(true);
    setMutationMessage(null);
    const next = await mutate(`${prefix}-${Date.now()}`);
    setSubscription(next);
    setMutationMessage('Subscription change saved.');
    setUpdating(false);
  };

  const handleCancelOrder = async (): Promise<void> => {
    if (!orderId || cancelPending) {
      return;
    }
    setCancelPending(true);
    await cancelOrder(orderId, `cancel-${Date.now()}`);
    setMutationMessage('Order cancelled.');
    setCancelPending(false);
  };

  const handleRefund = async (): Promise<void> => {
    if (!orderId || refundPending) {
      return;
    }
    setRefundPending(true);
    await requestReturn(orderId, 'parent_requested', 'Requested from mobile billing settings.', `refund-${Date.now()}`);
    setMutationMessage('Refund request submitted.');
    setRefundPending(false);
  };

  if (providerUnavailable) {
    return (
      <DeviceShell title="Add courses?" onBack={() => navigation.navigate(ROUTES.BundleScreen)}>
        <Box paddingHorizontal={24} paddingTop={40} gap={10}>
          <Text fontWeight="700" style={styles.heading}>Billing provider unavailable</Text>
          <Text style={styles.sub}>{providerUnavailable}</Text>
          <Text style={styles.note}>Cancel order unavailable</Text>
          <Text style={styles.note}>Refund request unavailable</Text>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Add courses?" onBack={() => navigation.navigate(ROUTES.BundleScreen)}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={2} total={3} />
        <Text fontWeight="600" style={styles.heading}>Optional · skip if you'd rather wait</Text>
        <Text style={styles.sub}>
          Robot already comes with the Hello Friends course. Add more only if you want — you can change this anytime.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} gap={8}>
        {currentPlan ? <Text style={styles.statusLine}>Current plan: {currentPlan.name}</Text> : null}
        {subscription ? <Text style={styles.statusLine}>Subscription status: {subscription.status}</Text> : null}
        {subscription?.currentPeriodEnd && subscription.cancelAtPeriodEnd ? (
          <Text style={styles.statusLine}>Renews until {subscription.currentPeriodEnd}</Text>
        ) : null}
        {updating ? <Text style={styles.statusLine}>Updating subscription...</Text> : null}
        {mutationMessage ? <Text style={styles.successText}>{mutationMessage}</Text> : null}
        {paymentMessage ? <Text style={styles.errorText}>{paymentMessage}</Text> : null}
        {OPTS.map(o => {
          const sel = pick === o.id;
          return (
            <TouchableOpacity key={o.id} onPress={() => setPick(o.id)} activeOpacity={0.8}
              accessibilityLabel={subscriptionOptionLabel(o.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              style={[styles.optCard, sel && styles.optCardSel]}>
              <Box style={[styles.radio, sel && styles.radioSel]}>
                {sel && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round">
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                )}
              </Box>
              <Box flex={1}>
                <Box flexDirection="row" alignItems="baseline" justifyContent="space-between" gap={10}>
                  <Text fontWeight="600" style={styles.optTag}>{o.tag}</Text>
                  <Text fontWeight="700" style={styles.optPrice}>{o.price}</Text>
                </Box>
                <Text style={styles.optBody}>{o.body}</Text>
                <Text style={styles.optSub}>{o.sub}</Text>
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>

      <Text style={styles.note}>Your child never sees prices. Subscriptions are managed only here.</Text>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30} gap={10}>
        {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd ? (
          <DeviceBigBtn secondary onClick={() => runSubscriptionMutation('sub-cancel', cancelSubscription)}>Cancel subscription</DeviceBigBtn>
        ) : null}
        {subscription?.cancelAtPeriodEnd ? (
          <DeviceBigBtn secondary onClick={() => runSubscriptionMutation('sub-reactivate', reactivateSubscription)}>Reactivate subscription</DeviceBigBtn>
        ) : null}
        {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd ? (
          <DeviceBigBtn secondary onClick={() => runSubscriptionMutation('sub-pause', pauseSubscription)}>Pause subscription</DeviceBigBtn>
        ) : null}
        {subscription?.status === 'paused' ? (
          <DeviceBigBtn secondary onClick={() => runSubscriptionMutation('sub-resume', resumeSubscription)}>Resume subscription</DeviceBigBtn>
        ) : null}
        <Text fontWeight="700" style={styles.manageTitle}>Manage billing</Text>
        {orderId ? (
          <>
            <DeviceBigBtn secondary onClick={handleCancelOrder}>{cancelPending ? 'Cancelling order...' : 'Cancel pending order'}</DeviceBigBtn>
            <DeviceBigBtn secondary onClick={handleRefund}>{refundPending ? 'Submitting refund...' : 'Request refund review'}</DeviceBigBtn>
          </>
        ) : (
          <Text style={styles.note}>No pending order to manage</Text>
        )}
        <DeviceBigBtn onClick={handleContinue}>Continue</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.BundleScreen)}>Back</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: PR.ink, letterSpacing: -0.3, lineHeight: 26, marginTop: 18 },
  sub: { fontSize: 13, color: PR.ink2, lineHeight: 20, marginTop: 6 },
  optCard: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  optCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: PR.accent },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: PR.hair,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  radioSel: { backgroundColor: PR.accent, borderWidth: 0 },
  optTag: { fontSize: 14, color: PR.ink },
  optPrice: { fontSize: 14, color: PR.ink, letterSpacing: -0.2 },
  optBody: { fontSize: 12, color: PR.ink2, lineHeight: 20, marginTop: 3 },
  optSub: { fontSize: 11, color: PR.ink3, marginTop: 5 },
  note: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 18 },
  statusLine: { fontSize: 12, color: PR.ink2, lineHeight: 18 },
  successText: { fontSize: 12, color: PR.good, lineHeight: 18 },
  errorText: { fontSize: 12, color: '#B42318', lineHeight: 18 },
  manageTitle: { fontSize: 14, color: PR.ink, paddingTop: 8 },
});

function subscriptionOptionLabel(id: typeof OPTS[number]['id']): string {
  if (id === 'none') return 'Choose no subscription';
  if (id === 'pack') return 'Choose Starter pack one-time purchase';
  return 'Choose All Courses subscription';
}
