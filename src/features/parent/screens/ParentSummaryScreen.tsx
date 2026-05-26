import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getParentSummary } from '@/services/api/parent.api';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSummaryScreen'>;
type SummaryParams = { deviceId?: string; summaryDate?: string };
type SummaryErrorState = { title: string; detail: string };

const STATS = [
  { v: '8', l: 'minutes' },
  { v: '1', l: 'lesson' },
  { v: '8', l: 'speaking turns' },
] as const;

export default function ParentSummaryScreen({ navigation, route }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorState, setErrorState] = React.useState<SummaryErrorState>({
    title: 'Parent summary unavailable',
    detail: 'Try again.',
  });
  const params = (route.params ?? {}) as SummaryParams;

  const loadSummary = React.useCallback(() => {
    let active = true;
    setStatus('loading');
    getParentSummary()
      .then((summary) => {
        if (active) {
          setStatus(summary && typeof summary === 'object' ? 'success' : 'error');
        }
      })
      .catch((error) => {
        if (active) {
          setErrorState(classifySummaryError(error));
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(loadSummary, [loadSummary]);

  if (status === 'loading') {
    return (
      <ParentScroll title="Parent Space">
        <Box paddingHorizontal={24} paddingTop={40}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Parent Space settings"
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Settings</Text>
          </TouchableOpacity>
          <Text style={styles.dateLabel}>Loading parent summary</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (status === 'error') {
    return (
      <ParentScroll title="Parent Space">
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Parent Space settings"
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Settings</Text>
          </TouchableOpacity>
          {params.summaryDate ? <Text style={styles.dateLabel}>Requested summary: {params.summaryDate}</Text> : null}
          {params.deviceId ? <Text style={styles.dateLabel}>Robot: {params.deviceId}</Text> : null}
          <Text fontWeight="700" style={styles.headline}>{errorState.title}</Text>
          <Text style={styles.dateLabel}>{errorState.detail}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Retry ${errorState.title}`}
            onPress={() => { loadSummary(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  return (
    <ParentScroll
      title="Parent Space"
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open Parent Space settings"
          onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
          activeOpacity={0.7}
        >
          <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Settings</Text>
        </TouchableOpacity>
      }
    >
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        <Text style={styles.dateLabel}>Today · Tuesday, Mar 12</Text>
        <Text fontWeight="600" style={styles.headline}>
          Mira practiced greetings and feelings for about 8 minutes.
        </Text>

        <Box flexDirection="row" gap={10} marginBottom={14} style={{ flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <Box key={s.l} style={styles.statCard} flex={1}>
              <Text fontWeight="600" style={styles.statVal}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </Box>
          ))}
        </Box>

        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentTodayScreen)}
          style={styles.todayCard}
          activeOpacity={0.8}
        >
          <Box flex={1}>
            <Text fontWeight="500" style={{ fontSize: 15, color: PA.ink }}>What Mira practiced today</Text>
            <Text style={{ fontSize: 13, color: PA.ink2, marginTop: 2 }}>Greetings · feelings · 3 new words</Text>
          </Box>
          <ChevronIcon />
        </TouchableOpacity>
      </Box>

      <PRowGroup header="History">
        <PRow icon="🗓" label="Past 30 days" value="22 days active" chevron onPress={() => navigation.navigate(ROUTES.ParentHistoryScreen)} />
        <PRow icon="📚" label="Course progress" value="Unit 3 of 8" chevron isLast />
      </PRowGroup>

      <PRowGroup header="Account">
        <PRow icon="🛡" label="Safety & Privacy" chevron onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)} />
        <PRow icon="⚙" label="Settings" chevron onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)} isLast />
      </PRowGroup>

      <Box paddingHorizontal={24} paddingTop={18} paddingBottom={36} alignItems="center">
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7}>
          <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Return to child play area</Text>
        </TouchableOpacity>
      </Box>
    </ParentScroll>
  );
}

function classifySummaryError(error: unknown): SummaryErrorState {
  const shaped = error as { status?: number; retryAfterSeconds?: number; code?: string };
  if (shaped.status === 429 || shaped.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      title: 'Parent summary refresh limited',
      detail: `Try again in ${shaped.retryAfterSeconds ?? 30} seconds.`,
    };
  }
  if (shaped.status === 502 || shaped.code === 'INTERNAL_ERROR') {
    return { title: 'Parent summary service unavailable', detail: 'Retry in a moment.' };
  }
  return { title: 'Parent summary unavailable', detail: 'Try again.' };
}

function ChevronIcon() {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dateLabel: { fontSize: 13, color: PA.ink3, marginBottom: 6 },
  headline: { fontSize: 22, color: PA.ink, letterSpacing: -0.3, lineHeight: 29, marginBottom: 18 },
  statCard: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair, borderRadius: 12, padding: 12 },
  statVal: { fontSize: 22, color: PA.ink, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, color: PA.ink2, marginTop: 2 },
  todayCard: {
    width: '100%', backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  retryText: { color: PA.accent, fontSize: 15, fontWeight: '500' },
});
