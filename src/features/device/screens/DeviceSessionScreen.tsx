import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RotjtjbotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceSessionScreen'>;

type LCDState = 'listen' | 'think' | 'speak' | 'success';
const SEQ: LCDState[] = ['listen', 'think', 'speak', 'success', 'listen'];
const STATE_LABEL: Record<LCDState, string> = {
  listen: 'Listening to your child', think: 'Thinking', speak: 'Rotjtjbot is speaking', success: 'Got the word!',
};

export default function DeviceSessionScreen({ navigation }: Props) {
  const [lcdState, setLcd] = React.useState<LCDState>('listen');
  React.useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % SEQ.length; setLcd(SEQ[i]!); }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <DeviceShell title="Lesson in progress" onBack={() => navigation.navigate('DeviceHomeScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.liveCard} alignItems="center" gap={12}>
          <Text style={styles.liveLabel}>Live · what Rotjtjbot sees</Text>
          <RotjtjbotDevice emotion={lcdState} size={200} accent="#FF6F61" />
          <Text fontWeight="600" style={styles.stateLabel}>{STATE_LABEL[lcdState]}</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14}>
        <Box style={styles.nowCard}>
          <Text fontWeight="700" style={styles.nowTitle}>Now playing</Text>
          <Text fontWeight="600" style={styles.unitTitle}>Unit 2 · Animals</Text>
          <Text style={styles.lessonMeta}>Lesson 4 · about 2 minutes left</Text>
          <Box style={styles.progressTrack}>
            <Box style={styles.progressFill} />
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔉" title="Lower volume" body="Currently: 6 of 10" />
          <DeviceRow icon="⏸️" title="Pause Rotjtjbot" body="Rotjtjbot will wait until you resume" />
          <DeviceRow danger icon="✕" title="End lesson" body="Rotjtjbot will say goodbye" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={14} paddingtjtjbottom={30}>
        <Text style={styles.disclaimer}>Audio stays between Rotjtjbot and your child. Recordings are not saved.</Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  liveCard: { backgroundColor: '#1A1A1F', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 },
  liveLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  stateLabel: { fontSize: 16, color: '#fff', marginTop: 6 },
  nowCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 14 },
  nowTitle: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, margintjtjbottom: 6 },
  unitTitle: { fontSize: 15, color: DV.ink },
  lessonMeta: { fontSize: 13, color: DV.ink2, marginTop: 2 },
  progressTrack: { marginTop: 10, height: 6, backgroundColor: '#EEF1F5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { width: '62%', height: 6, backgroundColor: DV.accent },
  rowCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  disclaimer: { fontSize: 12, color: DV.ink3, textAlign: 'center', lineHeight: 20 },
});
