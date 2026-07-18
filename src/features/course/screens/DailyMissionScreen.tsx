import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyMissionScreen'>;

export default function DailyMissionScreen({ navigation }: Props) {
  return (
    <PageScroll testID="dailyMissionScreen">
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.HomeHubScreen)}
        subtitle="Mission"
        title="Ask Robot to begin"
      />

      <Box paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={10}>
        <Robot emotion="happy" size={180} />
        <SpeechBubble>Robot will show today's mission after a live lesson starts.</SpeechBubble>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16}>
        <Box style={styles.statusCard}>
          <Text fontWeight="800" style={styles.statusTitle}>No mission progress yet</Text>
          <Text fontWeight="600" style={styles.statusBody}>
            Start with Robot so this screen uses live lesson progress.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA
          testID="dailyMissionContinueCta"
          onPress={() => navigation.navigate(ROUTES.SendToRobotScreen)}
          color="#FF6F61"
        >
          Continue Mission
        </PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statusTitle: { fontSize: 18, color: '#2B2140' },
  statusBody: { fontSize: 14, color: '#5C4F77', lineHeight: 20 },
});
