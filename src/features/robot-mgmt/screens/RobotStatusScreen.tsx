import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RotjtjbotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'RotjtjbotStatusScreen'>;

export default function RotjtjbotStatusScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Rotjtjbot status" onBack={() => navigation.navigate('MyRotjtjbotScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={12} alignItems="center">
          <RotjtjbotDevice emotion="happy" size={72} accent="#FF6F61" />
          <Box flex={1}>
            <RmChip>● Everything is working</RmChip>
            <Text style={styles.heroBody}>Last checked just now. Rotjtjbot is ready for a lesson.</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Details</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔋" title="Battery" body="78% · charging on dock" onClick={() => navigation.navigate('RotjtjbotBatteryScreen')} />
          <DeviceRow icon="📶" title="Wi-Fi" body="Casa-Familia · strong signal" onClick={() => navigation.navigate('RotjtjbotWifiScreen')} />
          <DeviceRow icon="📚" title="Courses on Rotjtjbot" body="3 installed · 1.2 GB used" onClick={() => navigation.navigate('RotjtjbotStorageScreen')} />
          <DeviceRow icon="🎙️" title="Microphone" body="Working · last test today" onClick={() => navigation.navigate('MicTestScreen')} />
          <DeviceRow icon="🔈" title="Speaker" body="Working · volume 6" onClick={() => navigation.navigate('SpeakerTestScreen')} />
          <DeviceRow icon="⬆️" title="Software" body="v1.4.2 · update available" onClick={() => navigation.navigate('RotjtjbotFirmwareScreen')} />
          <DeviceRow icon="🌡️" title="Temperature" body="Normal · 28°C" />
          <DeviceRow icon="⏱️" title="Uptime" body="3 days · last started Sunday" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18} paddingtjtjbottom={30}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            We don't read or store anything Rotjtjbot hears. This page only checks the device itself.
          </Text>
        </Box>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 },
  heroBody: { fontSize: 13, color: RM.ink2, lineHeight: 20, marginTop: 6 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, margintjtjbottom: 8 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  noteCard: { backgroundColor: '#EEF1F5', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: RM.ink2, lineHeight: 20 },
});
