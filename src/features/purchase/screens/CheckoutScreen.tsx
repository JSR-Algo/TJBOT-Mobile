import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';
import { ROUTES } from '@/navigation/routes';
import {
  createCheckoutSession,
  type CheckoutSessionPayload,
} from '@/services/api/purchase.api';
import { isSubscriptionFeatureEnabled } from '@/config/feature-flags';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckoutScreen'>;

const ORDER_ITEMS = [
  { t: 'Robot device + Hello Friends course', s: 'Includes dock & cable',              p: '$149.00' },
  { t: 'All Courses · monthly',               s: '7-day free trial · cancel anytime',  p: '$0.00' },
  { t: 'Shipping',                            s: 'Free · arrives in 3–5 business days', p: 'Free' },
];

const SAVED_SHIPPING_PROFILE: CheckoutSessionPayload['billing_address'] | null = null;

export default function CheckoutScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const [error, setError] = React.useState<string | null>(null);

  if (!isSubscriptionFeatureEnabled()) {
    return (
      <DeviceShell title="Checkout" onBack={() => navigation.navigate(ROUTES.PrivacyScreen)}>
        <Box testID="checkoutDisabledPlaceholder" paddingHorizontal={24} paddingTop={40}>
          <Text fontWeight="700" style={styles.disabledTitle}>Purchases return in v1.1</Text>
          <Text style={styles.disabledBody}>Robot checkout is paused in this build.</Text>
        </Box>
      </DeviceShell>
    );
  }

  const placeOrder = async (): Promise<void> => {
    if (!SAVED_SHIPPING_PROFILE) {
      setError('Shipping profile is missing. Add a saved address before checkout.');
      return;
    }
    const session = await createCheckoutSession({
      sku_id: 'robot-hello-friends-bundle',
      quantity: 1,
      billing_address: SAVED_SHIPPING_PROFILE,
    }, `checkout-${Date.now()}`);
    if (session.state === 'paid' && session.orderId) {
      navigation.navigate(ROUTES.OrderConfirmScreen, { orderId: session.orderId });
    }
  };

  return (
    <DeviceShell title="Checkout" onBack={() => navigation.navigate(ROUTES.PrivacyScreen)}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={2} total={3} />
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Your order</Text>
        <Box style={styles.orderCard}>
          {ORDER_ITEMS.map((r, i) => (
            <Box key={r.t} style={[styles.orderRow, i < ORDER_ITEMS.length - 1 && styles.orderBorder]}>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.orderTitle}>{r.t}</Text>
                <Text style={styles.orderSub}>{r.s}</Text>
              </Box>
              <Text fontWeight="600" style={styles.orderPrice}>{r.p}</Text>
            </Box>
          ))}
          <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end" style={styles.totalRow}>
            <Text fontWeight="700" style={styles.totalLabel}>Today's total</Text>
            <Text fontWeight="700" style={styles.totalPrice}>$149.00</Text>
          </Box>
          <Text style={styles.trialNote}>Subscription begins after free trial. We email a reminder 2 days before.</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Ship to</Text>
        <Box style={styles.shipCard}>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.shipName}>Missing</Text>
            <Text style={styles.shipAddr}>Add a saved shipping address before checkout</Text>
          </Box>
          <TouchableOpacity
            disabled
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('Edit shipping address, Unavailable')}
            accessibilityState={{ disabled: true }}
          >
            <Text fontWeight="600" style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Payment</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🍎" title="Apple Pay" body="Touch ID · default" />
          <DeviceRow icon="💳" title="Card ending 4421" body="Visa · expires 12/27" />
        </Box>
      </Box>

      <Text style={styles.legalNote}>30-day return · 2-year warranty · no auto-renew without notice</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Box paddingHorizontal={20} paddingTop={10} paddingBottom={30}>
        <DeviceBigBtn onClick={placeOrder}>Place order · $149.00</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, color: PR.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  orderCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, padding: 14 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  orderBorder: { borderBottomWidth: 1, borderBottomColor: PR.hair },
  orderTitle: { fontSize: 13, color: PR.ink },
  orderSub: { fontSize: 11, color: PR.ink2, marginTop: 2 },
  orderPrice: { fontSize: 14, color: PR.ink },
  totalRow: { paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: PR.hair },
  totalLabel: { fontSize: 14, color: PR.ink },
  totalPrice: { fontSize: 20, color: PR.ink, letterSpacing: -0.3 },
  trialNote: { fontSize: 11, color: PR.ink2, lineHeight: 18, marginTop: 6 },
  shipCard: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  shipName: { fontSize: 14, color: PR.ink },
  shipAddr: { fontSize: 12, color: PR.ink2, marginTop: 2, lineHeight: 20 },
  editBtn: { fontSize: 13, color: PR.accent },
  rowCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  legalNote: { fontSize: 11, color: PR.ink3, lineHeight: 18, textAlign: 'center', paddingHorizontal: 18, paddingVertical: 18 },
  errorText: { fontSize: 12, color: '#B42318', lineHeight: 18, textAlign: 'center', paddingHorizontal: 20 },
  disabledTitle: { fontSize: 22, color: PR.ink, marginBottom: 8 },
  disabledBody: { fontSize: 13, color: PR.ink2, lineHeight: 20 },
});
