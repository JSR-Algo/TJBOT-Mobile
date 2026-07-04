import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { parentColors, parentRadii, parentShadows } from '@/design-system/tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotStatusScreen'>;

export default function RobotStatusScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot status" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      {/* Hero card with status */}
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={12} alignItems="center">
          <Text style={styles.heroEmoji}>🤖</Text>
          <Box flex={1}>
            <Box marginBottom={6}>
              <RmChip>● Everything is working</RmChip>
            </Box>
            <Text style={styles.heroBody}>Last checked just now. Robot is ready for a lesson.</Text>
          </Box>
        </Box>
      </Box>

      {/* Details section */}
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Details</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔋" title="Battery" body="78% · charging on dock" onClick={() => navigation.navigate(ROUTES.RobotBatteryScreen)} />
          <DeviceRow icon="📶" title="Wi-Fi" body="Casa-Familia · strong signal" onClick={() => navigation.navigate(ROUTES.RobotWifiScreen)} />
          <DeviceRow icon="📚" title="Courses on Robot" body="3 installed · 1.2 GB used" onClick={() => navigation.navigate(ROUTES.RobotStorageScreen)} />
          <DeviceRow icon="🎙️" title="Microphone" body="Working · last test today" onClick={() => navigation.navigate(ROUTES.MicTestScreen)} />
          <DeviceRow icon="🔈" title="Speaker" body="Working · volume 6" onClick={() => navigation.navigate(ROUTES.SpeakerTestScreen)} />
          <DeviceRow icon="⬆️" title="Software" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.RobotFirmwareScreen)} />
          <DeviceRow icon="🌡️" title="Temperature" body="Normal · 28°C" />
          <DeviceRow icon="⏱️" title="Uptime" body="3 days · last started Sunday" />
        </Box>
      </Box>

      {/* Privacy note */}
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={30}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            We don't read or store anything Robot hears. This page only checks the device itself.
          </Text>
        </Box>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: parentColors.blush,
    borderRadius: parentRadii.hero,
    padding: 14,
    ...parentShadows.card,
  },
  heroEmoji: {
    fontSize: 48,
    flexShrink: 0,
  },
  heroBody: {
    fontSize: 13,
    color: parentColors.ink1,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    color: parentColors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontWeight: '700',
  },
  rowCard: {
    backgroundColor: parentColors.card,
    borderWidth: 1,
    borderColor: parentColors.line,
    borderRadius: parentRadii.card,
    paddingVertical: 4,
    paddingHorizontal: 4,
    ...parentShadows.card,
  },
  noteCard: {
    backgroundColor: parentColors.card2,
    borderRadius: parentRadii.card,
    padding: 14,
  },
  noteText: {
    fontSize: 12,
    color: parentColors.ink2,
    lineHeight: 20,
  },
});
