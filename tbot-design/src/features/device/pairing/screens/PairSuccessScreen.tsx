import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSuccessScreen'>;

const FACTS = [
  { ic: '🤖', t: 'Robot listens & speaks', b: 'Mic and speaker on the Robot, not your phone.' },
  { ic: '📚', t: 'Starter course is loaded', b: 'Unit 1 is on the device, ready to go.' },
  { ic: '🛡️', t: 'Audio is not saved', b: 'Conversations stay between Robot and your child.' },
] as const;

export default function PairSuccessScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot is ready">
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="celebrate" size={200} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>Your Robot is paired</Text>
        <Text style={styles.sub}>
          Lessons will play <Text fontWeight="600" style={{ color: DV.ink }}>on the Robot</Text>. Your phone is just for setup, progress, and safety.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.factCard}>
          {FACTS.map((r, i) => (
            <Box
              key={r.t}
              style={[styles.factRow, i < FACTS.length - 1 && styles.factBorder]}
              flexDirection="row"
              gap={12}
              alignItems="flex-start"
            >
              <Box style={styles.factIcon} alignItems="center" justifyContent="center">
                <Text style={{ fontSize: 16 }}>{r.ic}</Text>
              </Box>
              <Box>
                <Text fontWeight="600" style={styles.factTitle}>{r.t}</Text>
                <Text style={styles.factBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairRenameScreen')}>Choose a Buddy & name</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: DV.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 30 },
  sub: { fontSize: 14, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  factCard: { backgroundColor: DV.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: DV.hair },
  factRow: { padding: 12 },
  factBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  factIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF1F5', flexShrink: 0 },
  factTitle: { fontSize: 13, color: DV.ink },
  factBody: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginTop: 2 },
});
