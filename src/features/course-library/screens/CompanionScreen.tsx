import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanionScreen'>;

const PHASES = [
  { lcd: 'speak',   label: 'Robot is speaking',    time: '00:42' },
  { lcd: 'listen',  label: 'Robot is listening',   time: '00:51' },
  { lcd: 'think',   label: 'Robot is thinking',    time: '00:55' },
  { lcd: 'success', label: 'Robot heard them!',     time: '01:02' },
  { lcd: 'happy',   label: 'Robot is celebrating', time: '01:08' },
];

export default function CompanionScreen({ navigation }: Props) {
  const [phase, setPhase] = React.useState(2);

  React.useEffect(() => {
    const t = setTimeout(() => setPhase(p => (p + 1) % PHASES.length), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  const cur = PHASES[phase]!;

  return (
    <DeviceShell title="What Robot sees" onBack={() => navigation.navigate('RunningScreen')}>
      <Text style={styles.intro}>
        A live mirror of Robot's face. <Text fontWeight="600" style={{ color: CL.ink }}>No transcript</Text> — what your child says stays between them.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.lcdMirror} alignItems="center" gap={12}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.liveRow}>
            <Box style={styles.liveDot} />
            <Text style={styles.liveText}>Live · {cur.time}</Text>
          </Box>
          <LCDFace emotion={cur.lcd} size={220} accent="#FF6F61" />
          <Text fontWeight="600" style={styles.phaseLabel}>{cur.label}</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.progressCard}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end" style={styles.progressHeader}>
            <Text fontWeight="600" style={styles.progressTitle}>Animals at home</Text>
            <Text style={styles.progressCount}>3 / 8 turns</Text>
          </Box>
          <Box style={styles.progressTrack}>
            <Box style={styles.progressFill} />
          </Box>
          <Box flexDirection="row" justifyContent="space-between" style={styles.progressFooter}>
            <Text style={styles.progressMeta}>About 2 minutes left</Text>
            <Text style={styles.progressMeta}>Words: 4 of 10</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>If you need to</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10" />
          <DeviceRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'" />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  lcdMirror: { backgroundColor: '#0E1116', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 },
  liveRow: { alignSelf: 'flex-start' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF5454' },
  liveText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  phaseLabel: { fontSize: 15, color: '#fff', marginTop: 4 },
  progressCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  progressHeader: { marginBottom: 8 },
  progressTitle: { fontSize: 13, color: CL.ink },
  progressCount: { fontSize: 11, color: CL.ink2 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  progressFill: { width: '37%', height: '100%' as any, backgroundColor: CL.accent, borderRadius: 4 },
  progressFooter: { marginTop: 8 },
  progressMeta: { fontSize: 11, color: CL.ink2 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
