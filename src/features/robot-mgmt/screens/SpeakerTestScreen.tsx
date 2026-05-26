import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'SpeakerTestScreen'>;

type Played = 'chime' | 'voice' | null;

export default function SpeakerTestScreen({ navigation }: Props) {
  const [played, setPlayed] = React.useState<Played>(null);
  return (
    <DeviceShell title="Speaker test" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lcdWrap}>
          <LCDFace emotion={played ? 'happy' : 'idle'} size={140} accent="#FF6F61" />
        </Box>
        <Text fontWeight="600" style={styles.heading}>Can you hear Robot?</Text>
        <Text style={styles.sub}>Tap a sound to play it at the current volume (6 of 10).</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24} gap={10}>
        <TouchableOpacity
          onPress={() => setPlayed('chime')} activeOpacity={0.8}
          style={[styles.soundCard, played === 'chime' && styles.soundCardSel]}
        >
          <Box style={[styles.soundIcon, { backgroundColor: '#E8F0FE' }]} alignItems="center" justifyContent="center">
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.soundTitle}>Soft chime</Text>
            <Text style={styles.soundSub}>Robot's "lesson starting" sound</Text>
          </Box>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={RM.accent}><Path d="M8 5v14l11-7z" /></Svg>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPlayed('voice')} activeOpacity={0.8}
          style={[styles.soundCard, played === 'voice' && styles.soundCardSel]}
        >
          <Box style={[styles.soundIcon, { backgroundColor: '#E6F4EE' }]} alignItems="center" justifyContent="center">
            <Text style={{ fontSize: 20 }}>🎤</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.soundTitle}>Robot's voice</Text>
            <Text style={styles.soundSub}>"Hello! I'm so glad you're here."</Text>
          </Box>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={RM.good}><Path d="M8 5v14l11-7z" /></Svg>
        </TouchableOpacity>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔊" title="Adjust volume" body="Currently 6 of 10" onClick={() => navigation.navigate(ROUTES.RobotSoundScreen)} />
          <DeviceRow icon="📐" title="Place Robot in the open" body="Not in a drawer or under a blanket" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>I can hear Robot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.SupportScreen)}>Robot sounds quiet or muffled</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 14, padding: 8 },
  heading: { fontSize: 22, color: RM.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 18 },
  sub: { fontSize: 13, color: RM.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 20, marginTop: 6 },
  soundCard: {
    backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center',
  },
  soundCardSel: { borderWidth: 2, borderColor: RM.accent },
  soundIcon: { width: 44, height: 44, borderRadius: 11 },
  soundTitle: { fontSize: 14, color: RM.ink },
  soundSub: { fontSize: 12, color: RM.ink2, marginTop: 2 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
