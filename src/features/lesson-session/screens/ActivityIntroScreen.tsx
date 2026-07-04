import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { gardenColors } from '@/design-system/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityIntroScreen'>;

const TOTAL = 5;

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <Box flexDirection="row" gap={10} justifyContent="center">
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotActive,
            i > current && styles.dotPending,
          ]}
        />
      ))}
    </Box>
  );
}

export default function ActivityIntroScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <LessonHeader progress={0.15} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
      <Box style={styles.dotsRow} alignItems="center">
        <ProgressDots total={TOTAL} current={0} />
      </Box>
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Box style={styles.activityBadge}>
          <Text fontWeight="700" style={styles.activityBadgeText}>Activity 1 of {TOTAL}</Text>
        </Box>
        <Robot emotion="happy" size={120} />
        <Text fontWeight="800" style={styles.title}>Let's name some animals!</Text>
        <Box flexDirection="row" gap={14}>
          {['🐱', '🐶', '🐰'].map(e => (
            <Text key={e} style={{ fontSize: 48 }}>{e}</Text>
          ))}
        </Box>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.RobotSpeakingScreen)} color={gardenColors.coral}>Start</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dotsRow: { position: 'absolute', top: 120, left: 0, right: 0 },
  center: { paddingTop: 160, paddingHorizontal: 24, paddingBottom: 200 },
  activityBadge: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  activityBadgeText: { fontSize: 14, color: gardenColors.coral, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, color: gardenColors.ink, textAlign: 'center' },
  dot: { height: 12, borderRadius: 6 },
  dotDone: { width: 12, backgroundColor: '#7BD389' },
  dotActive: { width: 28, backgroundColor: gardenColors.coral },
  dotPending: { width: 12, backgroundColor: 'rgba(0,0,0,0.1)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
