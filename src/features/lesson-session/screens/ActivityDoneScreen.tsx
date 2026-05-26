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

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityDoneScreen'>;

const ANIMALS = ['🐱', '🐶', '🐰'] as const;

export default function ActivityDoneScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8F8F0">
      <LessonHeader progress={0.6} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen)} />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Text fontWeight="800" style={styles.doneTitle}>Activity done!</Text>
        <Robot emotion="success" size={220} accent="#E8A33C" />
        <Box flexDirection="row" gap={14}>
          {ANIMALS.map(e => (
            <Box key={e} style={styles.animalCard} alignItems="center" justifyContent="center">
              <Text style={{ fontSize: 36 }}>{e}</Text>
            </Box>
          ))}
        </Box>
        <Text fontWeight="700" style={styles.friendsText}>3 new word friends!</Text>
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.RobotSpeakingScreen)} color="#FF6F61">Keep going →</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  doneTitle: { fontSize: 38, color: '#7BD389' },
  animalCard: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', borderWidth: 3, borderColor: '#7BD389', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  friendsText: { fontSize: 16, color: 'rgba(0,0,0,0.5)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
