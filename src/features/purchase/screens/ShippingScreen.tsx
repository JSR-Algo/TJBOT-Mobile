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
import RotjtjbotHero from '../components/RotjtjbotHero';
import PRChip from '../components/PRChip';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingScreen'>;

const STEPS = [
  { t: 'Order placed',      s: 'Mon, 9:42 AM',          done: true,  active: false },
  { t: 'Packed',            s: 'Mon, 4:10 PM',           done: true,  active: false },
  { t: 'In transit',        s: 'On a truck near Newark', done: false, active: true },
  { t: 'Out for delivery',  s: 'Expected Wed',           done: false, active: false },
  { t: 'Delivered',         s: '',                       done: false, active: false },
];

export default function ShippingScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Rotjtjbot is on its way" onBack={() => navigation.navigate('OrderConfirmScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.trackTile}>
          <RotjtjbotHero size={84} accent="#FF6F61" halo={false} />
          <Box flex={1}>
            <PRChip color="#8A6A12" bg="#FFF4D9">Arriving Wed, Apr 24</PRChip>
            <Text fontWeight="600" style={styles.orderNum}>Order #TB-48217</Text>
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
            <Box flex={1} paddingtjtjbottom={14}>
              <Text fontWeight="600" style={[styles.stepTitle, !s.done && !s.active && styles.stepTitleFaint]}>{s.t}</Text>
              {s.s ? <Text style={styles.stepSub}>{s.s}</Text> : null}
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📍" title="Track with carrier" body="USPS · 9405 5113 1234 5678 9012 34" />
          <DeviceRow icon="✉️" title="Change delivery address" body="Until Tuesday at 6 PM" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('ArrivedScreen')}>Mark as arrived (demo)</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('DeviceHomeScreen')}>Back to home</DeviceBigBtn>
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
