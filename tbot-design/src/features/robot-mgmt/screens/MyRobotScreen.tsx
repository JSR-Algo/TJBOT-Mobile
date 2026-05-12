import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmStat from '../components/RmStat';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRobotScreen'>;

export default function MyRobotScreen({ navigation }: Props) {
  return (
    <DeviceShell title="My Robot" onBack={() => navigation.navigate('ParentTodayScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={14} alignItems="center">
          <RobotDevice emotion="happy" size={96} accent="#FF6F61" />
          <Box flex={1} style={{ minWidth: 0 }}>
            <Text fontWeight="600" style={styles.pairedLabel}>Paired Robot</Text>
            <Text fontWeight="600" style={styles.robotName}>Buddy Panda</Text>
            <Text style={styles.robotMeta}>ROB-2A8F · Cream</Text>
            <Box marginTop={8}><RmChip>● Online · all good</RmChip></Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={16}>
        <Text fontWeight="700" style={styles.sectionLabel}>Status</Text>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Box style={{ width: '47%' }}>
            <RmStat icon="🔋" label="Battery" value="78% · charging" status="ok" onClick={() => navigation.navigate('RobotBatteryScreen')} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="📶" label="Wi-Fi" value="Casa-Familia" status="ok" onClick={() => navigation.navigate('RobotWifiScreen')} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="📚" label="Courses" value="3 installed" status="ok" onClick={() => navigation.navigate('RobotStorageScreen')} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="🎙️" label="Microphone" value="Working" status="ok" onClick={() => navigation.navigate('MicTestScreen')} />
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Care</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔊" title="Sound & volume" body="Volume 6 · Quiet hours on" onClick={() => navigation.navigate('RobotSoundScreen')} />
          <DeviceRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={() => navigation.navigate('MicTestScreen')} />
          <DeviceRow icon="🔈" title="Speaker test" body="Play a chime to check audio" onClick={() => navigation.navigate('SpeakerTestScreen')} />
          <DeviceRow icon="⬆️" title="Robot software" body="v1.4.2 · update available" onClick={() => navigation.navigate('RobotFirmwareScreen')} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Help</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={() => navigation.navigate('OfflineHelpScreen')} />
          <DeviceRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={() => navigation.navigate('SupportScreen')} />
          <DeviceRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, sync, sensors" onClick={() => navigation.navigate('RobotStatusScreen')} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow danger icon="⚠️" title="Factory reset" body="Erase data and start fresh · parent gate" onClick={() => navigation.navigate('FactoryResetScreen')} />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 16, padding: 18 },
  pairedLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  robotName: { fontSize: 18, color: RM.ink, letterSpacing: -0.3, marginTop: 2 },
  robotMeta: { fontSize: 12, color: RM.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
