import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { parentColors } from '@/design-system/tokens';
import PRStepTab from '../components/PRStepTab';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'IncludedScreen'>;

const ITEMS = [
  { ic: '🤖', t: 'Robot device',             b: '3.2" LCD face, soft-touch shell, 8-hour battery' },
  { ic: '🔌', t: 'Charging dock',            b: 'USB-C cable, magnet-aligned base' },
  { ic: '📱', t: 'Parent app',               b: 'Free, no ads, course library and summaries' },
  { ic: '🎁', t: 'Hello Friends starter course', b: '24 lessons of greetings, names, and feelings' },
  { ic: '📖', t: 'Quick start booklet',      b: 'Setup in 5 minutes, with Spanish & English' },
  { ic: '🛡️', t: '2-year warranty',          b: 'Replace or refund if anything goes wrong' },
];

export default function IncludedScreen({ navigation }: Props) {
  return (
    <DeviceShell title="In the box" onBack={() => navigation.navigate(ROUTES.HowItWorksScreen)}>
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

      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.BundleScreen)}>Choose a bundle</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: parentColors.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 29, marginTop: 18 },
  listCard: { backgroundColor: parentColors.card, borderWidth: 1, borderColor: parentColors.line, borderRadius: 16, overflow: 'hidden' },
  listRow: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: parentColors.line },
  listIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: parentColors.card2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle: { fontSize: 14, color: parentColors.ink },
  listBody: { fontSize: 12, color: parentColors.ink2, marginTop: 2, lineHeight: 18 },
  note: { fontSize: 12, color: parentColors.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 18 },
});
