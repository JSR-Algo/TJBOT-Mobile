import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';

type Props = NativeStackScreenProps<RootStackParamList, 'IncludedScreen'>;

const ITEMS = [
  { ic: '🤖', t: 'Rotjtjbot device',             b: '3.2" LCD face, soft-touch shell, 8-hour battery' },
  { ic: '🔌', t: 'Charging dock',            b: 'USB-C cable, magnet-aligned base' },
  { ic: '📱', t: 'Parent app',               b: 'Free, no ads, course library and summaries' },
  { ic: '🎁', t: 'Hello Friends starter course', b: '24 lessons of greetings, names, and feelings' },
  { ic: '📖', t: 'Quick start booklet',      b: 'Setup in 5 minutes, with Spanish & English' },
  { ic: '🛡️', t: '2-year warranty',          b: 'Replace or refund if anything goes wrong' },
];

export default function IncludedScreen({ navigation }: Props) {
  return (
    <DeviceShell title="In the box" onBack={() => navigation.navigate('HowItWorksScreen')}>
      <Box paddingHorizontal={24} paddingTop={18} alignItems="center">
        <PRStepTab step={2} total={3} />
        <Text fontWeight="600" style={styles.heading}>Everything to start tomorrow</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.listCard}>
          {ITEMS.map((r, i) => (
            <Box key={r.t} style={[styles.listRow, i < ITEMS.length - 1 && styles.listBorder]}>
              <Box style={styles.listIcon}><Text style={{ fontSize: 16 }}>{r.ic}</Text></Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.listTitle}>{r.t}</Text>
                <Text style={styles.listBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Text style={styles.note}>Hardware is yours. The starter course is included forever.</Text>

      <Box paddingHorizontal={20} paddingTop={18} paddingtjtjbottom={30}>
        <DeviceBigBtn onClick={() => navigation.navigate('BundleScreen')}>Choose a bundle</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: PR.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 29, marginTop: 18 },
  listCard: { backgroundColor: PR.card, borderWidth: 1, borderColor: PR.hair, borderRadius: 16, overflow: 'hidden' },
  listRow: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  listBorder: { bordertjtjbottomWidth: 1, bordertjtjbottomColor: PR.hair },
  listIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: PR.warm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle: { fontSize: 14, color: PR.ink },
  listBody: { fontSize: 12, color: PR.ink2, marginTop: 2, lineHeight: 18 },
  note: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 18 },
});
