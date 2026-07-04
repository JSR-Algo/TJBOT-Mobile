import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RobotImage from '@/components/RobotImage';
import { parentColors } from '@/design-system/tokens';
import { getOrder, type Order } from '@/services/api/purchase.api';
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmScreen'>;

export default function OrderConfirmScreen({ navigation, route }: Props) {
  const orderId = route.params?.orderId;
  const [order, setOrder] = React.useState<Order | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const refreshedOrderId = React.useRef<string | null>(null);

  const loadOrder = React.useCallback(async (): Promise<void> => {
    if (!orderId) {
      return;
    }
    setStatus('loading');
    try {
      const next = await getOrder(orderId);
      setOrder(next);
      setStatus('ready');
      if (next.status === 'paid' && refreshedOrderId.current !== next.id) {
        refreshedOrderId.current = next.id;
        await refreshEntitlementsAfterPurchase();
      }
    } catch {
      setStatus('error');
    }
  }, [orderId]);

  React.useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  if (!orderId) {
    return (
      <DeviceShell title="Order placed">
        <Box paddingHorizontal={24} paddingTop={40}>
          <Text fontWeight="700" style={styles.heading}>Order link is missing</Text>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CheckoutScreen)}>Back to checkout</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  if (status === 'loading') {
    return (
      <DeviceShell title="Order placed">
        <Box paddingHorizontal={24} paddingTop={40}>
          <Text style={styles.sub}>Loading order...</Text>
        </Box>
      </DeviceShell>
    );
  }

  if (status === 'error') {
    return (
      <DeviceShell title="Order placed">
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <Text fontWeight="700" style={styles.heading}>Order needs a retry</Text>
          <DeviceBigBtn onClick={loadOrder}>Retry order status</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  if (order?.status !== 'paid') {
    return (
      <DeviceShell title="Order placed">
        <Box paddingHorizontal={24} paddingTop={40}>
          <Text fontWeight="700" style={styles.heading}>Payment not complete</Text>
          <Text style={styles.sub}>Finish payment before delivery setup.</Text>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Order placed">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.checkCircle}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={parentColors.success} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Order confirmed</Text>
        <Text style={styles.sub}>
          Robot is on its way. We'll send a setup nudge when it arrives — no rush.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.orderTile}>
          <RobotImage variant="body" size={80} />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.orderLabel}>Order #{order.id}</Text>
            <Text fontWeight="600" style={styles.orderTitle}>Robot · Cream</Text>
            <Text style={styles.orderSub}>Hello Friends starter course</Text>
            <Text style={styles.orderSub}>$149.00 · paid with Apple Pay</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>Next</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📦" title="Today"        body="We're packing your order" />
          <DeviceRow icon="🚚" title="Tue – Thu"    body="Arrives at 247 Linden St · free shipping" />
          <DeviceRow icon="🤖" title="When it arrives" body="Open the app — we'll guide setup in 5 minutes" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Box style={styles.emailCard}>
          <Text style={styles.emailText}>
            We just emailed your receipt to <Text fontWeight="600" style={{ color: parentColors.ink }}>sarah@example.com</Text>.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.ShippingScreen, { orderId: order.id })}>Track delivery</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Back to home</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: parentColors.okBg, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 26, color: parentColors.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 30, marginTop: 18 },
  sub: { fontSize: 14, color: parentColors.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  orderTile: {
    backgroundColor: parentColors.card, borderWidth: 1, borderColor: parentColors.line, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  orderLabel: { fontSize: 11, color: parentColors.ink2, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderTitle: { fontSize: 14, color: parentColors.ink, marginTop: 3 },
  orderSub: { fontSize: 12, color: parentColors.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: parentColors.ink2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: parentColors.card, borderWidth: 1, borderColor: parentColors.line, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  emailCard: { backgroundColor: parentColors.card2, borderRadius: 12, padding: 14 },
  emailText: { fontSize: 12, color: parentColors.ink2, lineHeight: 20 },
});
