import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewNeededScreen'>;

export default function ReviewNeededScreen({ navigation }: Props) {
  return (
    <PageScroll bg="#FFE6BD">
      <PageHeader onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} subtitle="Review" title="Let's visit again" />
      <Box paddingHorizontal={24} paddingBottom={16} flexDirection="row" alignItems="center" gap={12}>
        <Robot emotion="curious" size={120} accent="#FFC857" />
        <SpeechBubble>Robot will choose words after live progress is available.</SpeechBubble>
      </Box>
      <Box paddingHorizontal={18} paddingBottom={16}>
        <Box style={styles.statusCard}>
          <Text fontWeight="800" style={styles.statusTitle}>No review list yet</Text>
          <Text fontWeight="600" style={styles.statusBody}>
            Start with Robot so timing comes from real lesson history.
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal={24} paddingTop={10} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.SendToRobotScreen)} color="#FFC857">
          Practice together
        </PrimaryCTA>
        <TouchableOpacity
          accessibilityLabel="Maybe later"
          accessibilityRole="button"
          onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          activeOpacity={0.7}
          style={styles.laterBtn}
        >
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77' }}>Maybe later</Text>
        </TouchableOpacity>
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
  laterBtn: { alignItems: 'center', paddingVertical: 8 },
});
