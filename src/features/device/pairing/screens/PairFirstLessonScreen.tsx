import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairFirstLessonScreen'>;

const NEXT_STEPS = [
  { n: '1', t: 'Robot greets your child by Buddy', b: '"Hi! I\'m Panda. Want to play?"' },
  { n: '2', t: 'A 4-minute starter lesson plays', b: 'On the Robot — your phone can stay in your pocket.' },
  { n: '3', t: 'You\'ll see today\'s summary here', b: 'Words practiced, time, and what to revisit tomorrow.' },
] as const;

export default function PairFirstLessonScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Box style={styles.parentBar}>
        <Text fontWeight="700" style={styles.parentKicker}>For grown-ups</Text>
        <Text fontWeight="600" style={styles.parentText}>Place Robot on the table. Hand it over when you're ready.</Text>
      </Box>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="happy" size={220} accent="#FF6F61" />
        <Text fontWeight="800" style={styles.heroTitle}>Robot is waiting!</Text>
        <Text style={styles.heroSub}>
          Your child will tap "yes" on the Robot to start their very first lesson.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={30}>
        <Text fontWeight="700" style={styles.sectionLabel}>What happens next</Text>
        <Box style={styles.stepsCard}>
          {NEXT_STEPS.map((r, i) => (
            <Box
              key={r.n}
              style={[styles.stepRow, i < NEXT_STEPS.length - 1 && styles.stepBorder]}
              flexDirection="row"
              gap={12}
              alignItems="flex-start"
            >
              <Box style={styles.numBadge} alignItems="center" justifyContent="center">
                <Text fontWeight="700" style={styles.numText}>{r.n}</Text>
              </Box>
              <Box>
                <Text fontWeight="600" style={styles.stepTitle}>{r.t}</Text>
                <Text style={styles.stepBody}>{r.b}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24}>
        <PrimaryCTA onPress={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] })} color="#FF6F61">Hand it to your child</PrimaryCTA>
        <Text style={styles.note}>You'll get a calm summary in this app after each lesson.</Text>
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },
  parentBar: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  parentKicker: { fontSize: 11, color: DV.accent, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  parentText: { fontSize: 14, color: DV.ink, lineHeight: 20 },
  heroTitle: { fontSize: 28, color: DV.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 33, marginTop: 24 },
  heroSub: { fontSize: 14, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  sectionLabel: { fontSize: 11, color: DV.ink2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  stepsCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  stepRow: { padding: 12 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  numBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF6F61', flexShrink: 0, marginTop: 2 },
  numText: { fontSize: 12, color: '#fff' },
  stepTitle: { fontSize: 13, color: DV.ink },
  stepBody: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginTop: 2 },
  note: { fontSize: 12, color: DV.ink2, textAlign: 'center', marginTop: 12, lineHeight: 22 },
});
