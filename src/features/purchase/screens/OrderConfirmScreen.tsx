import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import RobotHero from '../components/RobotHero';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmScreen'>;

export default function OrderConfirmScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Order placed">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.checkCircle}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={PR.good} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Thank you, Sarah</Text>
        <Text style={styles.sub}>
          Robot is on its way. We'll send a setup nudge when it arrives — no rush.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.orderTile}>
          <RobotHero size={84} accent="#FF6F61" halo={false} />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.orderLabel}>Order #TB-48217</Text>
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
            We just emailed your receipt to <Text fontWeight="600" style={{ color: PR.ink }}>sarah@example.com</Text>.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('ShippingScreen')}>Track delivery</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('DeviceHomeScreen')}>Back to home</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F4EE', alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 26, color: PR.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 30, marginTop: 18 },
  sub: { fontSize: 14, color: PR.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  orderTile: {
    backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  orderLabel: { fontSize: 11, color: PR.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderTitle: { fontSize: 14, color: PR.ink, marginTop: 3 },
  orderSub: { fontSize: 12, color: PR.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: PR.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  emailCard: { backgroundColor: PR.warm, borderRadius: 12, padding: 14 },
  emailText: { fontSize: 12, color: PR.ink2, lineHeight: 20 },
});
