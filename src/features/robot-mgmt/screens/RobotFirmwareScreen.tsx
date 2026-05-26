import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotFirmwareScreen'>;

const WHATS_NEW = [
  'Robot waits a little longer before nudging',
  'Better hearing in noisier rooms',
  '3 new gentle celebration sounds',
];

export default function RobotFirmwareScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot software" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box paddingTop={24} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lcdWrap}>
          <LCDFace emotion="thinking" size={130} accent="#FF6F61" />
        </Box>
        <Box marginTop={14}><RmChip color={RM.warn} bg="#FFF4D9">New version available</RmChip></Box>
        <Text fontWeight="600" style={styles.heading}>Robot has a small update</Text>
        <Text style={styles.sub}>
          Updates Robot's listening, fixes small things, and adds gentle improvements. Your child's progress is kept.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.versionCard}>
          <Box flexDirection="row" alignItems="center" justifyContent="space-between" style={{ marginBottom: 10 }}>
            <Box>
              <Text fontWeight="600" style={styles.verLabel}>Current</Text>
              <Text fontWeight="600" style={styles.verNum}>v1.4.2</Text>
            </Box>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={RM.ink3} strokeWidth={2} strokeLinecap="round">
              <Path d="M5 12h14M13 6l6 6-6 6" />
            </Svg>
            <Box alignItems="flex-end">
              <Text fontWeight="600" style={styles.verLabel}>New</Text>
              <Text fontWeight="600" style={[styles.verNum, { color: RM.accent }]}>v1.5.0</Text>
            </Box>
          </Box>
          <Box style={styles.divider} />
          <Text fontWeight="600" style={styles.whatsNewTitle}>What's new</Text>
          {WHATS_NEW.map(t => (
            <Text key={t} style={styles.whatsNewItem}>• {t}</Text>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🛡️" title="Safe to update" body="Your child's progress and courses are kept" />
          <DeviceRow icon="⏱️" title="Takes about 6 minutes" body="Plug Robot in. We'll let you know when done." />
          <DeviceRow icon="🔌" title="Don't unplug Robot" body="Wait until the soft chime. We handle the rest." />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>Update Robot now</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>Remind me tomorrow</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 14, padding: 8 },
  heading: { fontSize: 22, color: RM.ink, letterSpacing: -0.3, textAlign: 'center', lineHeight: 26, marginTop: 10 },
  sub: { fontSize: 14, color: RM.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 6 },
  versionCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 14 },
  verLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  verNum: { fontSize: 15, color: RM.ink, marginTop: 2 },
  divider: { height: 1, backgroundColor: RM.hair, marginVertical: 10 },
  whatsNewTitle: { fontSize: 13, color: RM.ink, marginBottom: 6 },
  whatsNewItem: { fontSize: 13, color: RM.ink2, lineHeight: 24 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
