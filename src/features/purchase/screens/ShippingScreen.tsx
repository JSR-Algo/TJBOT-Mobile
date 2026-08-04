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
import { PR } from '../purchase.local-tokens';
import RobotHero from '../components/RobotHero';
import PRChip from '../components/PRChip';
import { getShippingStatus, type ShippingStatus } from '@/services/api/purchase.api';
import { ROUTES } from '@/navigation/routes';
import PurchaseStatusCard from '../components/PurchaseStatusCard';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingScreen'>;

const STEPS = [
  { t: 'Order placed',      s: 'Mon, 9:42 AM',          done: true,  active: false },
  { t: 'Packed',            s: 'Mon, 4:10 PM',           done: true,  active: false },
  { t: 'In transit',        s: 'On a truck near Newark', done: false, active: true },
  { t: 'Out for delivery',  s: 'Expected Wed',           done: false, active: false },
  { t: 'Delivered',         s: '',                       done: false, active: false },
];

export default function ShippingScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const orderId = route.params?.orderId;
  const [shipping, setShipping] = React.useState<ShippingStatus | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'error' | 'ready'>('loading');

  const loadShipping = React.useCallback(async (): Promise<void> => {
    if (!orderId) {
      return;
    }
    setStatus('loading');
    try {
      setShipping(await getShippingStatus(orderId));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [orderId]);

  React.useEffect(() => {
    void loadShipping();
  }, [loadShipping]);

  if (!orderId) {
    return (
      <DeviceShell title="Robot is on its way" onBack={() => navigation.navigate(ROUTES.OrderConfirmScreen)}>
        <Box paddingHorizontal={20} paddingTop={28} gap={16}>
          <PurchaseStatusCard
            icon="MapPinned"
            title="Tracking link is missing"
            body="Open delivery tracking from a confirmed order to see its route."
            tone="warning"
          />
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.OrderConfirmScreen)}>Back to order</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  if (status === 'loading') {
    return (
      <DeviceShell title="Robot is on its way" onBack={() => navigation.navigate(ROUTES.OrderConfirmScreen, { orderId })}>
        <Box paddingHorizontal={20} paddingTop={28}>
          <PurchaseStatusCard
            icon="Truck"
            title="Loading delivery"
            body="Checking the carrier for the latest delivery update."
          />
        </Box>
      </DeviceShell>
    );
  }

  if (status === 'error') {
    return (
      <DeviceShell title="Robot is on its way" onBack={() => navigation.navigate(ROUTES.OrderConfirmScreen, { orderId })}>
        <Box paddingHorizontal={20} paddingTop={28} gap={16}>
          <PurchaseStatusCard
            icon="RefreshCcw"
            title="Shipping needs a retry"
            body="The carrier update is temporarily unavailable. Your order is still safe."
            tone="danger"
          />
          <DeviceBigBtn onClick={loadShipping}>Retry shipping status</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Robot is on its way" onBack={() => navigation.navigate(ROUTES.OrderConfirmScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.trackTile}>
          <RobotHero size={84} accent="#FF6F61" halo={false} />
          <Box flex={1}>
            <PRChip color="#8A6A12" bg="#FFF4D9">Arriving {shipping?.estimatedDelivery ?? t('soon')}</PRChip>
            <Text fontWeight="600" style={styles.orderNum}>Order #{orderId}</Text>
            <Text style={styles.address}>247 Linden St · Apt 3B</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={24}>
        {STEPS.map((s, i) => (
          <Box key={s.t} flexDirection="row" gap={14} style={styles.timelineRow}>
            <Box alignItems="center">
              <Box style={[
                styles.dot,
                s.done && styles.dotDone,
                s.active && styles.dotActive,
              ]}>
                {s.done && (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                )}
                {s.active && <Box style={styles.activePulse} />}
              </Box>
              {i < STEPS.length - 1 && <Box style={[styles.line, s.done && styles.lineDone]} />}
            </Box>
            <Box flex={1} paddingBottom={14}>
              <Text fontWeight="600" style={[styles.stepTitle, !s.done && !s.active && styles.stepTitleFaint]}>{s.t}</Text>
              {s.s ? <Text style={styles.stepSub}>{s.s}</Text> : null}
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16}>
        <Box style={styles.rowCard}>
          <DeviceRow
            icon="MapPin"
            title="Track with carrier"
            body={translateTemplate(
              'Carrier {{tracking}}',
              { tracking: shipping?.trackingNumber ?? t('pending') },
              { locale: language },
            )}
          />
          <DeviceRow icon="Mail" title="Change delivery address" body="Until Tuesday at 6 PM" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {shipping?.status === 'delivered' ? (
          <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.ArrivedScreen, { orderId })}>Robot has arrived</DeviceBigBtn>
        ) : null}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Back to home</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  trackTile: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14,
    padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center',
  },
  orderNum: { fontSize: 14, color: PR.ink, marginTop: 6 },
  address: { fontSize: 12, color: PR.ink2, marginTop: 2 },
  timelineRow: { minHeight: 54, position: 'relative' },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: PR.hair, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dotDone: { backgroundColor: PR.good, borderWidth: 0 },
  dotActive: { borderColor: PR.accent, borderWidth: 2 },
  activePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: PR.accent },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(0,0,0,0.1)', marginTop: 2 },
  lineDone: { backgroundColor: PR.good },
  stepTitle: { fontSize: 14, color: PR.ink },
  stepTitleFaint: { color: PR.ink3 },
  stepSub: { fontSize: 12, color: PR.ink2, marginTop: 2 },
  rowCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
