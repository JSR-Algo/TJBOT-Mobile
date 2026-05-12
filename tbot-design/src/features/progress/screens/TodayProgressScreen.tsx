import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const BAR_VALUES = [0.4, 0.7, 0.5, 0.9, 0.6, 0, 0];
const TODAY_IDX = 3;

export default function TodayProgressScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate('HomeHubScreen')}
        subtitle="Today"
        title="You practiced speaking!"
      />
      <Box paddingHorizontal={24} paddingTop={4} paddingBottom={14} alignItems="center">
        <Robot emotion="happy" size={170} />
      </Box>

      <Box paddingHorizontal={18} paddingBottom={14} flexDirection="row" gap={10}>
        <StatChip icon="🎤" value="8" label="speaking turns" color="#FF6F61" />
        <StatChip icon="📚" value="1" label="lesson done" color="#6CE2B6" />
        <StatChip icon="⭐" value="12" label="stars today" color="#FFC857" />
      </Box>

      <Box paddingHorizontal={18} paddingBottom={14}>
        <Box style={styles.weekCard}>
          <Text fontWeight="800" style={styles.weekTitle}>This week</Text>
          <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end" gap={8} style={{ height: 90 }}>
            {DAYS.map((d, i) => {
              const v = BAR_VALUES[i];
              const isToday = i === TODAY_IDX;
              return (
                <Box key={i} flex={1} alignItems="center" gap={6}>
                  <Box
                    style={[
                      styles.bar,
                      { height: v ? v * 90 : 8, backgroundColor: isToday ? '#FF6F61' : v ? '#6CE2B6' : 'rgba(0,0,0,0.06)' },
                    ]}
                  />
                  <Text fontWeight="700" style={{ fontSize: 12, color: isToday ? '#FF6F61' : '#5C4F77' }}>{d}</Text>
                </Box>
              );
            })}
          </Box>
          <Text fontWeight="700" style={styles.streak}>🔥 5-day streak — nice!</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate('HomeHubScreen')} color="#FF6F61">Back home</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function StatChip({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <Box style={styles.statChip} flex={1} alignItems="center" gap={4}>
      <Box style={[styles.statIcon, { backgroundColor: color }]}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </Box>
      <Text fontWeight="800" style={styles.statValue}>{value}</Text>
      <Text fontWeight="700" style={styles.statLabel}>{label}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  statChip: {
    backgroundColor: '#fff', borderRadius: 24, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  statIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 30, color: '#2B2140', lineHeight: 32 },
  statLabel: { fontSize: 12, color: '#5C4F77', textAlign: 'center' },
  weekCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  weekTitle: { fontSize: 16, color: '#2B2140', marginBottom: 10 },
  bar: { width: '70%', borderRadius: 8 },
  streak: { marginTop: 10, fontSize: 13, color: '#5C4F77' },
});
