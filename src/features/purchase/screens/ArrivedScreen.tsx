import React from 'react';
import { StyleSheet } from 'react-native';
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
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'ArrivedScreen'>;

export default function ArrivedScreen({ navigation, route }: Props) {
  const orderId = route.params?.orderId;

  if (!orderId) {
    return (
      <DeviceShell title="Robot is here">
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <Text fontWeight="700" style={styles.heading}>Delivery link is missing</Text>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.ShippingScreen)}>Back to tracking</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title="Robot is here">
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <RobotHero size={220} accent="#FF6F61" />
        <Box style={styles.chipWrap}>
          <PRChip color={PR.good} bg="#E6F4EE">📦 Delivered today</PRChip>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Your Robot has arrived</Text>
        <Text style={styles.sub}>Setup takes about 5 minutes. Find a quiet spot and a nearby outlet.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📦" title="1. Open the box"       body="Robot, charging dock, USB-C cable" />
          <DeviceRow icon="🔌" title="2. Plug in the dock"   body="Place Robot on it — a soft chime means hello" />
          <DeviceRow icon="📶" title="3. Connect to your Wi-Fi" body="We'll guide you screen-by-screen" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>Setting up later? Robot will wait quietly in its box.</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.ActivateScreen, { orderId })}>Set up Robot now</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Later tonight</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 14 },
  heading: { fontSize: 28, color: PR.ink, letterSpacing: -0.5, textAlign: 'center', lineHeight: 32, marginTop: 14 },
  sub: { fontSize: 14, color: PR.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  rowCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  noteCard: { backgroundColor: PR.warm, borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center' },
});
