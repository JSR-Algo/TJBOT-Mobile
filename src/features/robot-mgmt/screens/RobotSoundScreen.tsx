import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotSoundScreen'>;

const VOICES = [
  { id: 'warm', t: 'Warm', s: 'Friendly · default' },
  { id: 'calm', t: 'Calm', s: 'Slower, softer' },
  { id: 'bright', t: 'Bright', s: 'A little playful' },
] as const;

type VoiceId = typeof VOICES[number]['id'];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!on)}
      style={[styles.toggleTrack, { backgroundColor: on ? RM.good : '#D5D5D5' }]}
      activeOpacity={0.8}
    >
      <Box style={[styles.toggleThumb, { left: on ? 22 : 2 }]} />
    </TouchableOpacity>
  );
}

export default function RobotSoundScreen({ navigation }: Props) {
  const [vol, setVol] = React.useState(6);
  const [chime, setChime] = React.useState(true);
  const [quiet, setQuiet] = React.useState(true);
  const [voice, setVoice] = React.useState<VoiceId>('warm');

  return (
    <DeviceShell title="Sound & volume" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.volCard}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end" style={{ marginBottom: 14 }}>
            <Text fontWeight="600" style={styles.volTitle}>Robot's voice volume</Text>
            <Text fontWeight="700" style={styles.volNum}>{vol}<Text style={styles.volDenom}>/10</Text></Text>
          </Box>
          <Box style={{ flexDirection: 'row', gap: 5 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <TouchableOpacity
                key={i} onPress={() => setVol(i + 1)} activeOpacity={0.8}
                style={[styles.volSeg, { backgroundColor: i < vol ? RM.accent : '#EEF1F5' }]}
              />
            ))}
          </Box>
          <Box flexDirection="row" justifyContent="space-between" style={{ marginTop: 8 }}>
            <Text style={styles.volHint}>Quiet</Text>
            <Text style={styles.volHint}>Living-room</Text>
            <Text style={styles.volHint}>Loud</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Robot's voice</Text>
        <Box style={{ flexDirection: 'row', gap: 8 }}>
          {VOICES.map(v => {
            const sel = voice === v.id;
            return (
              <TouchableOpacity
                key={v.id} onPress={() => setVoice(v.id)} activeOpacity={0.8}
                style={[styles.voiceCard, sel && styles.voiceCardSel]}
              >
                <Text fontWeight="600" style={styles.voiceTitle}>{v.t}</Text>
                <Text style={styles.voiceSub}>{v.s}</Text>
              </TouchableOpacity>
            );
          })}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Sounds</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔔" title="Soft chimes" body="When a lesson starts and ends" right={<Toggle on={chime} onChange={setChime} />} />
          <DeviceRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM · half volume" right={<Toggle on={quiet} onChange={setQuiet} />} />
          <DeviceRow icon="▶️" title="Play test sound" body="A 2-second chime, at current volume" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={30}>
        <Text style={styles.note}>
          Robot's voice changes apply on the next lesson. Test sound plays now.
        </Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  volCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 18 },
  volTitle: { fontSize: 13, color: RM.ink },
  volNum: { fontSize: 24, color: RM.ink, letterSpacing: -0.4 },
  volDenom: { fontSize: 14, color: RM.ink3, fontWeight: '500' },
  volSeg: { flex: 1, height: 36, borderRadius: 6 },
  volHint: { fontSize: 11, color: RM.ink3 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  voiceCard: {
    flex: 1, backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair,
    borderRadius: 12, padding: 10, alignItems: 'center',
  },
  voiceCardSel: { backgroundColor: '#E8F0FE', borderWidth: 2, borderColor: RM.accent },
  voiceTitle: { fontSize: 14, color: RM.ink },
  voiceSub: { fontSize: 11, color: RM.ink2, marginTop: 2, textAlign: 'center' },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  toggleTrack: { width: 46, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb: { position: 'absolute', top: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  note: { fontSize: 12, color: RM.ink2, lineHeight: 20 },
});
