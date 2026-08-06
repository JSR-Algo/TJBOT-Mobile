import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'WordsPracticedScreen'>;

const STRONGER = [
  { w: 'Hello', icon: 'Hand' },
  { w: 'Cat',   icon: 'Cat' },
  { w: 'Happy', icon: 'Smile' },
] as const satisfies ReadonlyArray<{ w: string; icon: IconName }>;

const VISITING = [
  { w: 'Friend', icon: 'UsersRound' },
  { w: 'Dog',    icon: 'Dog' },
] as const satisfies ReadonlyArray<{ w: string; icon: IconName }>;

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
        <Box style={styles.sectionHeading} flexDirection="row" alignItems="center" gap={7}>
          <Icon name="TrendingUp" size={16} color={referenceColors.success} strokeWidth={2.6} />
          <Text fontWeight="700" style={styles.sectionLabel}>STRONGER</Text>
        </Box>
        <Box flexDirection="row" gap={10}>
          {STRONGER.map(t => <WordTile key={t.w} icon={t.icon} w={t.w} strong />)}
        </Box>
      </Box>

      <Box paddingHorizontal={18} paddingTop={14} paddingBottom={14}>
        <Box style={styles.sectionHeading} flexDirection="row" alignItems="center" gap={7}>
          <Icon name="Sprout" size={16} color={referenceColors.gold} strokeWidth={2.6} />
          <Text fontWeight="700" style={styles.sectionLabel}>VISIT AGAIN SOON</Text>
        </Box>
        <Box flexDirection="row" gap={10}>
          {VISITING.map(t => <WordTile key={t.w} icon={t.icon} w={t.w} />)}
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={10} paddingBottom={28}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)} color={referenceColors.primary}>
          Practice 2 words
        </PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function WordTile({ w, icon, strong }: { w: string; icon: IconName; strong?: boolean }) {
  return (
    <Box style={styles.tile} flex={1} gap={4}>
      <Box style={styles.tileIcon} alignItems="center" justifyContent="center">
        <Icon
          name={icon}
          size={26}
          color={strong ? referenceColors.success : referenceColors.gold}
          strokeWidth={2.4}
        />
      </Box>
      <Text fontWeight="800" style={{ fontSize: 20, color: referenceColors.ink }}>{w}</Text>
      <Box flexDirection="row" alignItems="center" gap={6} marginTop={2}>
        {strong ? (
          <>
            <Box flexDirection="row" gap={2}>
              {[0, 1, 2].map(i => (
                <Box key={i} style={[styles.bar, { backgroundColor: i < 2 ? referenceColors.success : referenceColors.line }]} />
              ))}
            </Box>
            <Text fontWeight="700" style={{ fontSize: 11, color: referenceColors.success }}>stronger</Text>
          </>
        ) : (
          <>
            <Box style={styles.dot} />
            <Text fontWeight="700" style={{ fontSize: 11, color: '#9A6A00' }}>visit again</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: referenceColors.card, borderRadius: 18, padding: 14,
    borderColor: referenceColors.line, borderWidth: 1, ...referenceShadow.card,
  },
  sectionHeading: { marginBottom: 8 },
  sectionLabel: { fontSize: 13, color: referenceColors.inkSoft, textTransform: 'uppercase', letterSpacing: 1.2 },
  tile: {
    backgroundColor: referenceColors.card, borderRadius: 20, padding: 14,
    borderColor: referenceColors.line, borderWidth: 1, ...referenceShadow.card,
  },
  tileIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: referenceColors.bgWarm },
  bar: { width: 14, height: 6, borderRadius: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: referenceColors.gold },
});
