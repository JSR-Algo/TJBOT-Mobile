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

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewEntryScreen'>;

export default function ReviewEntryScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.HomeHubScreen)}
        subtitle="Quick review"
        title="Ask Robot for review"
      />

      <Box paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={10}>
        <Robot emotion="curious" size={170} />
        <SpeechBubble>Robot will choose review words from live progress.</SpeechBubble>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16}>
        <Box style={styles.statusCard}>
          <Text fontWeight="800" style={styles.statusTitle}>No review words yet</Text>
          <Text fontWeight="600" style={styles.statusBody}>
            Start with Robot so this list is based on real lesson progress.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.SendToRobotScreen)} color="#FFC857">Start Review</PrimaryCTA>
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
