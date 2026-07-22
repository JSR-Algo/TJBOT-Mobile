import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { runMicTest } from '@/services/api/robot-mgmt.api';
import { ROUTES } from '@/navigation/routes';
import { FEATURE_DEVICE_MANAGEMENT } from '@/config/feature-flags';

type Props = NativeStackScreenProps<RootStackParamList, 'MicTestScreen'>;

type Phase = 'idle' | 'listening' | 'pass' | 'fail' | 'disabled';
const BARS = 14;

export default function MicTestScreen({ navigation }: Props) {
  const [phase, setPhase] = React.useState<Phase>(
    FEATURE_DEVICE_MANAGEMENT ? 'idle' : 'disabled',
  );

  const start = React.useCallback(async () => {
    if (!FEATURE_DEVICE_MANAGEMENT) {
      setPhase('disabled');
      return;
    }
    setPhase('listening');
    try {
      const result = await runMicTest();
      setPhase(result.passed ? 'pass' : 'fail');
    } catch {
      setPhase('fail');
    }
  }, []);

  const emotion =
    phase === 'disabled' ? 'sleep' :
    phase === 'listening' ? 'listening' :
    phase === 'pass' ? 'happy' :
    phase === 'fail' ? 'sad' :
    'idle';
  const heading =
    phase === 'disabled' ? 'Device tools are off' :
    phase === 'idle' ? 'Ready to listen' :
    phase === 'listening' ? 'Listening...' :
    phase === 'pass' ? 'Mic test heard sound' :
    'A little too quiet';
  const sub =
    phase === 'disabled'
      ? 'Device management is disabled in this build. Enable it in feature flags to test the microphone.'
      : phase === 'idle'
      ? 'Keep Robot nearby, then tap Start.'
      : phase === 'listening'
      ? 'Try saying "Hello, Robot!"'
      : phase === 'pass'
      ? 'You can run this test anytime if Robot seems quiet.'
      : 'Try again in a quieter spot.';

  return (
    <DeviceShell title="Microphone test" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lcdWrap}>
          <LCDFace emotion={emotion} size={140} accent="#FF6F61" />
        </Box>
        <Text fontWeight="600" style={styles.heading}>{heading}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </Box>

      <Box style={styles.meterRow} alignItems="flex-end" justifyContent="center">
        {Array.from({ length: BARS }).map((_, i) => {
          const dist = Math.abs(i - BARS / 2 + 0.5) / (BARS / 2);
          const h = phase === 'listening' ? 6 + (1 - dist * 0.6) * 50 : phase === 'pass' ? 6 + (1 - dist * 0.6) * 22 : 6;
          const bg = phase === 'pass' ? RM.good : phase === 'listening' ? RM.accent : phase === 'fail' ? RM.warn : '#D5D9E0';
          return <Box key={i} style={{ width: 7, height: h, borderRadius: 4, backgroundColor: bg, marginHorizontal: 2.5 }} />;
        })}
      </Box>

      <Box paddingHorizontal={24} paddingTop={24}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📍" title="Listening tips" body="Keep TVs and fans quiet during the test" />
          <DeviceRow icon="🌬️" title="Background noise" body={phase === 'pass' ? 'Quiet enough for this test' : 'Checking…'} />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        {phase === 'idle' && <DeviceBigBtn onClick={start}>Start mic test</DeviceBigBtn>}
        {phase === 'listening' && <DeviceBigBtn secondary disabled>Listening…</DeviceBigBtn>}
        {phase === 'pass' && (
          <>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>Looks good</DeviceBigBtn>
            <DeviceBigBtn secondary onClick={start}>Run test again</DeviceBigBtn>
          </>
        )}
        {phase === 'fail' && <DeviceBigBtn onClick={start}>Run test again</DeviceBigBtn>}
        {phase === 'disabled' && (
          <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>
            Back to Robot
          </DeviceBigBtn>
        )}
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 14, padding: 8 },
  heading: { fontSize: 22, color: RM.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 18 },
  sub: { fontSize: 13, color: RM.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 20, marginTop: 6 },
  meterRow: { paddingHorizontal: 30, paddingTop: 30, height: 90, flexDirection: 'row' },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
