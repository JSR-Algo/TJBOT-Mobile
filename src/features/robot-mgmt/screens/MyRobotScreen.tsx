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

type Props = NativeStackScreenProps<RootStackParamList, 'MyRobotScreen'>;

export default function MyRobotScreen({ navigation }: Props) {
  return (
    <DeviceShell title="My Robot" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      {/* Header: greeting + name + avatar */}
      <Box paddingHorizontal={16} paddingTop={12}>
        <Box style={styles.topHeader}>
          <Box flex={1}>
            <Text fontWeight="400" style={styles.greet}>Your robot</Text>
            <Text fontWeight="700" style={styles.greeting}>Buddy Panda</Text>
          </Box>
          <Box style={styles.avatar}>
            <Text style={styles.avatarText}>BP</Text>
          </Box>
        </Box>
      </Box>

      {/* Hero card with emoji and status */}
      <Box paddingHorizontal={16} paddingTop={14}>
        <Box style={styles.heroCard} flexDirection="row" gap={12} alignItems="center">
          <Text style={styles.heroEmoji}>🤖</Text>
          <Box flex={1} style={{ minWidth: 0 }}>
            <Text fontWeight="600" style={styles.robotName}>Buddy Panda</Text>
            <Text style={styles.robotMeta}>ROB-2A8F · Cream</Text>
            <Box marginTop={8}><RmChip>● Online · all good</RmChip></Box>
          </Box>
        </Box>
      </Box>

      {/* Status section */}
      <Box paddingHorizontal={16} paddingTop={16}>
        <Text fontWeight="700" style={styles.sectionLabel}>Status</Text>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Box style={styles.statCard}>
            <Text fontWeight="700" style={styles.statLabel}>🔋 Battery</Text>
            <Text fontWeight="600" style={styles.statValue}>78% · charging</Text>
          </Box>
          <Box style={styles.statCard}>
            <Text fontWeight="700" style={styles.statLabel}>📶 Wi-Fi</Text>
            <Text fontWeight="600" style={styles.statValue}>Casa-Familia</Text>
          </Box>
          <Box style={styles.statCard}>
            <Text fontWeight="700" style={styles.statLabel}>📚 Courses</Text>
            <Text fontWeight="600" style={styles.statValue}>3 installed</Text>
          </Box>
          <Box style={styles.statCard}>
            <Text fontWeight="700" style={styles.statLabel}>🎙️ Microphone</Text>
            <Text fontWeight="600" style={styles.statValue}>Working</Text>
          </Box>
        </Box>
      </Box>

      {/* Care section */}
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Care</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔊" title="Sound & volume" body="Volume 6 · Quiet hours on" onClick={() => navigation.navigate(ROUTES.RobotSoundScreen)} />
          <DeviceRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={() => navigation.navigate(ROUTES.MicTestScreen)} />
          <DeviceRow icon="🔈" title="Speaker test" body="Play a chime to check audio" onClick={() => navigation.navigate(ROUTES.SpeakerTestScreen)} />
          <DeviceRow icon="⬆️" title="Robot software" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.RobotFirmwareScreen)} />
        </Box>
      </Box>

      {/* Help section */}
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Help</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={() => navigation.navigate(ROUTES.OfflineHelpScreen)} />
          <DeviceRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={() => navigation.navigate(ROUTES.SupportScreen)} />
          <DeviceRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, sync, sensors" onClick={() => navigation.navigate(ROUTES.RobotStatusScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow danger icon="⚠️" title="Factory reset" body="Erase data and start fresh · parent gate" onClick={() => navigation.navigate(ROUTES.FactoryResetScreen)} />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greet: {
    fontSize: 13,
    color: parentColors.ink2,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    color: parentColors.ink,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: parentColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
  robotName: {
    fontSize: 18,
    color: parentColors.ink,
    letterSpacing: -0.3,
  },
  robotMeta: {
    fontSize: 12,
    color: parentColors.ink2,
    marginTop: 2,
  },
  statCard: {
    width: '47%',
    backgroundColor: parentColors.card,
    borderWidth: 1,
    borderColor: parentColors.line,
    borderRadius: parentRadii.card,
    padding: 12,
    ...parentShadows.card,
  },
  statLabel: {
    fontSize: 10,
    color: parentColors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    color: parentColors.ink,
    marginTop: 4,
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
});
