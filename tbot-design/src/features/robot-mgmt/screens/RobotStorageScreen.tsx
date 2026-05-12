import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotStorageScreen'>;

const COURSES = [
  { t: 'Hello Friends', s: '24 lessons · all downloaded', size: '420 MB', emo: 'happy', syncing: false },
  { t: 'Animals', s: '18 lessons · all downloaded', size: '380 MB', emo: 'curious', syncing: false },
  { t: 'Yummy Words', s: '20 lessons · syncing 12 of 20', size: '410 MB', emo: 'thinking', syncing: true },
] as const;

const LEGEND = [
  { color: '#9BC2EB', label: 'Hello Friends' },
  { color: '#B8D4A6', label: 'Animals' },
  { color: '#E5C56F', label: 'Yummy Words' },
] as const;

export default function RobotStorageScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Courses on Robot" onBack={() => navigation.navigate('MyRobotScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.gaugeCard}>
          <Box flexDirection="row" alignItems="flex-end" justifyContent="space-between" style={{ marginBottom: 10 }}>
            <Text fontWeight="700" style={styles.storageLabel}>Storage</Text>
            <Text style={styles.storageMeta}><Text fontWeight="600" style={{ color: RM.ink }}>1.21 GB</Text> of 4.0 GB used</Text>
          </Box>
          <Box style={styles.gaugeTrack}>
            <Box style={[styles.gaugeSegment, { width: '30%', backgroundColor: '#9BC2EB' }]} />
            <Box style={[styles.gaugeSegment, { width: '27%', backgroundColor: '#B8D4A6' }]} />
            <Box style={[styles.gaugeSegment, { width: '29%', backgroundColor: '#E5C56F' }]} />
          </Box>
          <Box flexDirection="row" gap={14} style={{ marginTop: 10 }}>
            {LEGEND.map(l => (
              <Box key={l.label} flexDirection="row" alignItems="center" gap={5}>
                <Box style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Installed</Text>
        <Box gap={8}>
          {COURSES.map(c => (
            <Box key={c.t} style={styles.courseCard} flexDirection="row" gap={12} alignItems="center">
              <Box style={styles.lcdWrap}>
                <LCDFace emotion={c.emo} size={48} accent="#FF6F61" />
              </Box>
              <Box flex={1} style={{ minWidth: 0 }}>
                <Text fontWeight="600" style={styles.courseName}>{c.t}</Text>
                <Text style={styles.courseMeta}>{c.s}</Text>
                {c.syncing && (
                  <Box style={styles.syncTrack}>
                    <Box style={styles.syncFill} />
                  </Box>
                )}
              </Box>
              <Text style={styles.courseSize}>{c.size}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔄" title="Sync now" body="Check for new lessons in your courses" />
          <DeviceRow icon="📚" title="Browse Course Library" body="Add or remove courses" onClick={() => navigation.navigate('CourseLibraryScreen')} />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  gaugeCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 16 },
  storageLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  storageMeta: { fontSize: 13, color: RM.ink2 },
  gaugeTrack: { height: 10, borderRadius: 6, backgroundColor: '#EEF1F5', overflow: 'hidden', flexDirection: 'row' },
  gaugeSegment: { height: '100%' as any },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, color: RM.ink2 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  courseCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 12 },
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 8, padding: 4, flexShrink: 0 },
  courseName: { fontSize: 14, color: RM.ink },
  courseMeta: { fontSize: 12, color: RM.ink2, marginTop: 2 },
  syncTrack: { marginTop: 6, height: 4, borderRadius: 2, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  syncFill: { width: '60%', height: 4, backgroundColor: RM.accent, borderRadius: 2 },
  courseSize: { fontSize: 11, color: RM.ink3 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
