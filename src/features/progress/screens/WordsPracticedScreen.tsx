import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'WordsPracticedScreen'>;

const STRONGER = [
  { w: 'Hello', icon: '👋' },
  { w: 'Cat',   icon: '🐱' },
  { w: 'Happy', icon: '😊' },
] as const;

const VISITING = [
  { w: 'Friend', icon: '👫' },
  { w: 'Dog',    icon: '🐶' },
] as const;

export default function WordsPracticedScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader onBack={() => navigation.navigate(ROUTES.TodayProgressScreen)} subtitle="Today" title="Words Practiced" />

      <Box paddingHorizontal={24} paddingBottom={8} flexDirection="row" alignItems="center" gap={12}>
        <RobotImage variant="body" size={60} />
        <Box style={styles.bubble} flex={1}>
          <Text fontWeight="700" style={{ fontSize: 14, color: '#2B2140', lineHeight: 20 }}>
            These words got stronger today.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={18} paddingTop={14} paddingBottom={8}>
        <Text fontWeight="700" style={styles.sectionLabel}>STRONGER 💪</Text>
        <Box flexDirection="row" gap={10}>
          {STRONGER.map(t => <WordTile key={t.w} icon={t.icon} w={t.w} strong />)}
        </Box>
      </Box>

      <Box paddingHorizontal={18} paddingTop={14} paddingBottom={14}>
        <Text fontWeight="700" style={styles.sectionLabel}>VISIT AGAIN SOON 🌱</Text>
        <Box flexDirection="row" gap={10}>
          {VISITING.map(t => <WordTile key={t.w} icon={t.icon} w={t.w} />)}
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={10} paddingBottom={28}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)} color="#FFC857">Practice 2 words</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function WordTile({ w, icon, strong }: { w: string; icon: string; strong?: boolean }) {
  return (
    <Box style={styles.tile} flex={1} gap={4}>
      <Text style={{ fontSize: 34 }}>{icon}</Text>
      <Text fontWeight="800" style={{ fontSize: 20, color: '#2B2140' }}>{w}</Text>
      <Box flexDirection="row" alignItems="center" gap={6} marginTop={2}>
        {strong ? (
          <>
            <Box flexDirection="row" gap={2}>
              {[0, 1, 2].map(i => (
                <Box key={i} style={[styles.bar, { backgroundColor: i < 2 ? '#6CE2B6' : 'rgba(0,0,0,0.1)' }]} />
              ))}
            </Box>
            <Text fontWeight="700" style={{ fontSize: 11, color: '#1F8A5B' }}>stronger</Text>
          </>
        ) : (
          <>
            <Box style={styles.dot} />
            <Text fontWeight="700" style={{ fontSize: 11, color: '#A06900' }}>visit again</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  sectionLabel: { fontSize: 13, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  tile: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  bar: { width: 14, height: 6, borderRadius: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFC857' },
});
