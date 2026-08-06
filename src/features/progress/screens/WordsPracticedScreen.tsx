import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'WordsPracticedScreen'>;

// There is no per-word vocabulary projection on the backend yet: the only
// word-level reads in `progress.api.ts` are unimplemented stubs. This screen
// therefore states that plainly instead of rendering sample words — a parent must
// never be shown fabricated evidence of what their child practised.
export default function WordsPracticedScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader onBack={() => navigation.navigate(ROUTES.TodayProgressScreen)} subtitle="Today" title="Words Practiced" />

      <Box paddingHorizontal={24} paddingBottom={8} flexDirection="row" alignItems="center" gap={12}>
        <Robot emotion="curious" size={80} />
        <Box style={styles.bubble} flex={1}>
          <Text fontWeight="700" style={{ fontSize: 14, color: '#2B2140', lineHeight: 20 }}>
            Robot is still collecting word practice from real lessons.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={18} paddingTop={14} paddingBottom={14}>
        <Box style={styles.statusCard}>
          <Text fontWeight="800" style={styles.statusTitle}>No practised words yet</Text>
          <Text fontWeight="600" style={styles.statusBody}>
            Word-by-word progress appears here once lessons on Robot report it.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={10} paddingBottom={28}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)} color="#FFC857">Practice together</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  statusCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  statusTitle: { fontSize: 18, color: '#2B2140' },
  statusBody: { fontSize: 14, color: '#5C4F77', lineHeight: 20 },
});
