import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceFirmwareScreen'>;

const CHANGES = [
  'Smoother face animations',
  'Better understanding of small voices',
  'Two new lesson celebrations',
  'Bug fixes',
];

export default function DeviceFirmwareScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Software update" onBack={() => navigation.navigate('DeviceHomeScreen')}>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.heroCard} flexDirection="row" gap={14} alignItems="center">
          <RobotDevice emotion="charging" size={84} accent="#FF6F61" />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.updateBadge}>Update available</Text>
            <Text fontWeight="600" style={styles.versionText}>v1.5.0 · 24 MB</Text>
            <Text style={styles.versionMeta}>About 4 minutes · Robot will be unavailable</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>What's new</Text>
        <Box style={styles.listCard}>
          {CHANGES.map((t, i) => (
            <Box key={t} style={[styles.listRow, i < CHANGES.length - 1 && styles.listBorder]} flexDirection="row" alignItems="flex-start" gap={10}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth={2.4} strokeLinecap="round" style={{ marginTop: 4 }}>
                <Path d="M5 12l5 5 9-10" />
              </Svg>
              <Text style={styles.listText}>{t}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('DeviceHomeScreen')}>Update tonight (recommended)</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('DeviceHomeScreen')}>Update now</DeviceBigBtn>
        <Text style={styles.note}>Tonight's update happens during quiet hours so Robot is ready in the morning.</Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 16 },
  updateBadge: { fontSize: 11, color: DV.warn, textTransform: 'uppercase', letterSpacing: 0.6 },
  versionText: { fontSize: 16, color: DV.ink, marginTop: 2 },
  versionMeta: { fontSize: 12, color: DV.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  listCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  listRow: { paddingVertical: 12, paddingHorizontal: 14 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  listText: { fontSize: 14, color: DV.ink, flex: 1, lineHeight: 22 },
  note: { fontSize: 12, color: DV.ink3, textAlign: 'center', lineHeight: 20 },
});
