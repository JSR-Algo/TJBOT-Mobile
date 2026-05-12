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

type Props = NativeStackScreenProps<RootStackParamList, 'PairIntroScreen'>;

const STEPS = [
  { n: '1', t: 'Plug in or use a charged Robot' },
  { n: '2', t: 'Hold the top button until it chimes' },
  { n: '3', t: 'Place Robot within 1–2 m of your phone' },
] as const;

export default function PairIntroScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Turn on Robot" onBack={() => navigation.navigate('PairAddScreen')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="charging" size={180} accent={DV.accent} />
        <Text fontWeight="600" style={styles.heading}>Power on your Robot</Text>
        <Text style={styles.sub}>
          Hold the button on top for 2 seconds. You'll hear a chime and see a friendly face when it's ready.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24} gap={8}>
        {STEPS.map(s => (
          <Box key={s.n} style={styles.stepCard} flexDirection="row" gap={12} alignItems="center">
            <Box style={styles.numBadge} alignItems="center" justifyContent="center">
              <Text fontWeight="700" style={styles.numText}>{s.n}</Text>
            </Box>
            <Text style={styles.stepText}>{s.t}</Text>
          </Box>
        ))}
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn onClick={() => navigation.navigate('PairSearchScreen')}>My Robot is on</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, color: DV.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 24 },
  sub: { fontSize: 14, color: DV.ink2, textAlign: 'center', maxWidth: 320, lineHeight: 22, marginTop: 8 },
  stepCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  numBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: DV.accent, flexShrink: 0 },
  numText: { fontSize: 13, color: '#fff' },
  stepText: { fontSize: 14, color: DV.ink, flex: 1 },
});
