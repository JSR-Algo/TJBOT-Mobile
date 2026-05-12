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

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceLostScreen'>;

export default function DeviceLostScreen({ navigation }: Props) {
  const [chiming, setChiming] = React.useState(false);
  return (
    <DeviceShell title="Find Robot" onBack={() => navigation.navigate('DeviceHomeScreen')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion={chiming ? 'happy' : 'sleep'} size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>
          {chiming ? 'Robot is chiming!' : "Can't find Robot?"}
        </Text>
        <Text style={styles.sub}>
          {chiming
            ? 'Listen for a soft melody. Robot will keep playing for 30 seconds.'
            : 'Robot will play a gentle melody so you can find it.'}
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30} gap={8}>
        <Box style={styles.infoCard} flexDirection="row" alignItems="center" gap={10}>
          <Box style={styles.dot} />
          <Text style={styles.infoText}>Last seen: 2 min ago · Wi-Fi · 78%</Text>
        </Box>
        <Box style={styles.infoCard} flexDirection="row" alignItems="center" gap={10}>
          <Text style={styles.infoText}>📍 Probably in: <Text fontWeight="600" style={{ color: DV.ink }}>the living room</Text></Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={30} paddingBottom={30}>
        <DeviceBigBtn onClick={() => setChiming(c => !c)}>
          {chiming ? 'Stop chime' : 'Make Robot chime'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: DV.ink, textAlign: 'center', marginTop: 24, maxWidth: 280 },
  sub: { fontSize: 14, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  infoCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DV.good },
  infoText: { fontSize: 14, color: DV.ink2 },
});
