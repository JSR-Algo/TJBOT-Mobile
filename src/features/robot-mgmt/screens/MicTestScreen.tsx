import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'MicTestScreen'>;

type Phase = 'idle' | 'listening' | 'done';
const BARS = 14;

export default function MicTestScreen({ navigation }: Props) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [level, setLevel] = React.useState(0);

  React.useEffect(() => {
    if (phase !== 'listening') return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setLevel(0.3 + 0.7 * Math.abs(Math.sin(t * 0.6)));
      if (t > 14) { clearInterval(id); setPhase('done'); setLevel(0); }
    }, 120);
    return () => clearInterval(id);
  }, [phase]);

  const emotion = phase === 'listening' ? 'listening' : phase === 'done' ? 'happy' : 'idle';
  const heading = phase === 'idle' ? 'Can Rotjtjbot hear you?' : phase === 'listening' ? 'Speak in your normal voice' : 'Rotjtjbot heard you clearly';
  const sub = phase === 'idle'
    ? "Stand about an arm's length from Rotjtjbot, then tap Start."
    : phase === 'listening' ? 'Try saying "Hello, Rotjtjbot!"'
    : 'You can run this test anytime if Rotjtjbot seems quiet.';

  return (
    <DeviceShell title="Microphone test" onBack={() => navigation.navigate('MyRotjtjbotScreen')}>
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
          const h = phase === 'listening'
            ? 6 + (1 - dist * 0.6) * level * 70
            : phase === 'done' ? 6 + (1 - dist * 0.6) * 22 : 6;
          const bg = phase === 'done' ? RM.good : phase === 'listening' ? RM.accent : '#D5D9E0';
          return <Box key={i} style={{ width: 7, height: h, borderRadius: 4, backgroundColor: bg, marginHorizontal: 2.5 }} />;
        })}
      </Box>

      <Box paddingHorizontal={24} paddingTop={24}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📍" title="Where Rotjtjbot listens best" body="Within 6 feet, away from TVs and fans" />
          <DeviceRow icon="🌬️" title="Background noise" body={phase === 'done' ? 'Low · good for lessons' : 'Checking…'} />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingtjtjbottom={30} gap={10}>
        {phase === 'idle' && <DeviceBigBtn onClick={() => setPhase('listening')}>Start test</DeviceBigBtn>}
        {phase === 'listening' && <DeviceBigBtn secondary>Listening…</DeviceBigBtn>}
        {phase === 'done' && (
          <>
            <DeviceBigBtn onClick={() => navigation.navigate('MyRotjtjbotScreen')}>Looks good</DeviceBigBtn>
            <DeviceBigBtn secondary onClick={() => setPhase('idle')}>Test again</DeviceBigBtn>
          </>
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
