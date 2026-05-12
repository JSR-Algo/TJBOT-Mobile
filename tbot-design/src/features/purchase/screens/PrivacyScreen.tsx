import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRChip from '../components/PRChip';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyScreen'>;

const ROWS = [
  { ic: '🎙️', t: "We don't save audio",       b: "What your child says is processed in real time and discarded. There is no transcript stored." },
  { ic: '🚫', t: 'No ads, ever',               b: 'Robot will never show, mention, or hint at advertising — at any age, in any course.' },
  { ic: '🔒', t: 'Parent-only purchases',      b: "Buying Robot, adding courses, or upgrading always passes through a parent gate." },
  { ic: '🌐', t: 'Stops if Robot is offline',  b: 'Robot only listens during a lesson, and a lesson can only start with your Wi-Fi.' },
  { ic: '📁', t: 'Easy data export & delete',  b: "Download or wipe your child's summary history with one tap, anytime." },
  { ic: '🇺🇸', t: 'COPPA & GDPR-K compliant', b: "Independently audited. Reports available in Settings → Safety & Privacy." },
];

export default function PrivacyScreen({ navigation }: Props) {
  return (
    <DeviceShell title="What we promise parents" onBack={() => navigation.navigate('SubscriptionsScreen')}>
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRChip color={PR.good} bg="#E6F4EE">Privacy first · always</PRChip>
        <Text fontWeight="600" style={styles.heading}>Your child's voice stays your child's</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={22}>
        <Box style={styles.listCard}>
          {ROWS.map((r, i) => (
            <Box key={r.t} style={[styles.listRow, i < ROWS.length - 1 && styles.listBorder]}>
              <Box style={styles.listIcon}><Text style={{ fontSize: 14 }}>{r.ic}</Text></Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.listTitle}>{r.t}</Text>
                <Text style={styles.listBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('CheckoutScreen')}>I'm ready · go to checkout</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('SubscriptionsScreen')}>Back</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: PR.ink, letterSpacing: -0.4, lineHeight: 29, marginTop: 14 },
  listCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 16, overflow: 'hidden' },
  listRow: { flexDirection: 'row', gap: 14, paddingVertical: 13, paddingHorizontal: 16 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: PR.hair },
  listIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#E6F4EE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle: { fontSize: 13, color: PR.ink },
  listBody: { fontSize: 12, color: PR.ink2, marginTop: 2, lineHeight: 18 },
});
