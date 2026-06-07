import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getParentHistory } from '@/services/api/parent.api';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { ScreenState } from '@/components/ScreenState';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentHistoryScreen'>;
type HistoryErrorState = { title: string; detail: string };

const VERBS = ['Greetings & feelings', 'Family words', 'Numbers 1–10', 'Animals', 'Daily routines', 'Color words', 'Food vocabulary', 'Polite phrases'] as const;

function buildDays() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const active = i % 7 !== 5;
    const date = new Date();
    date.setDate(date.getDate() - i);
    out.push({ i, date, active, min: 4 + ((i * 3) % 9), turns: 5 + ((i * 7) % 10), topic: VERBS[i % VERBS.length] });
  }
  return out;
}

export default function ParentHistoryScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentHistoryScreen);
  const days = React.useMemo(buildDays, []);
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorState, setErrorState] = React.useState<HistoryErrorState>({
    title: 'History unavailable',
    detail: 'Try again.',
  });

  const loadHistory = React.useCallback(() => {
    let active = true;
    setStatus('loading');
    getParentHistory()
      .then((history) => {
        if (active) {
          setStatus(Array.isArray(history) ? 'success' : 'error');
        }
      })
      .catch((error) => {
        if (active) {
          setErrorState(classifyHistoryError(error));
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(loadHistory, [loadHistory]);

  if (status === 'loading') {
    return (
      <ParentScroll title="Past 30 days" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
        <Box paddingHorizontal={24} paddingTop={40}>
          <ScreenState variant="loading" message="Loading history" />
        </Box>
      </ParentScroll>
    );
  }

  if (status === 'error') {
    return (
      <ParentScroll title="Past 30 days" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <Text fontWeight="700" style={styles.errorTitle}>{errorState.title}</Text>
          <Text style={styles.stat}>{errorState.detail}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Retry ${errorState.title}`}
            onPress={() => { loadHistory(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  return (
    <ParentScroll title="Past 30 days" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={4}>
        <Box flexDirection="row" gap={14}>
          <Text style={styles.stat}><Text fontWeight="600" style={{ color: PA.ink }}>22</Text> active days</Text>
          <Box style={styles.div} />
          <Text style={styles.stat}><Text fontWeight="600" style={{ color: PA.ink }}>2h 48m</Text> total</Text>
          <Box style={styles.div} />
          <Text style={styles.stat}><Text fontWeight="600" style={{ color: PA.ink }}>14</Text> lessons</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={28}>
        <Box style={styles.list} borderRadius={14} overflow="hidden">
          {days.map((d, i) => (
            <Box
              key={d.i}
              flexDirection="row"
              alignItems="center"
              gap={12}
              style={[
                styles.row,
                !d.active && { opacity: 0.55 },
                i < days.length - 1 && { borderBottomWidth: 1, borderBottomColor: PA.hair },
              ]}
            >
              <Box style={[styles.dayChip, d.active && { backgroundColor: '#EEF1F5' }]} alignItems="center">
                <Text style={styles.monthLabel}>{d.date.toLocaleDateString(undefined, { month: 'short' })}</Text>
                <Text fontWeight="600" style={styles.dayNum}>{d.date.getDate()}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight={d.active ? '500' : '400'} style={{ fontSize: 14, color: d.active ? PA.ink : PA.ink3 }} numberOfLines={1}>
                  {d.active ? d.topic : 'No practice'}
                </Text>
                {d.active ? (
                  <Text style={{ fontSize: 12, color: PA.ink2, marginTop: 2 }}>{d.min} min · {d.turns} speaking turns</Text>
                ) : null}
              </Box>
            </Box>
          ))}
        </Box>
        <Text style={styles.footer}>Daily summaries are kept for 30 days, then deleted automatically.</Text>
      </Box>
    </ParentScroll>
  );
}

function classifyHistoryError(error: unknown): HistoryErrorState {
  const shaped = error as { code?: string };
  if (shaped.code === 'NETWORK_ERROR') {
    return { title: 'History offline', detail: 'Check your internet connection and try again.' };
  }
  return { title: 'History unavailable', detail: 'Try again.' };
}

const styles = StyleSheet.create({
  stat: { fontSize: 13, color: PA.ink2 },
  errorTitle: { fontSize: 20, color: PA.ink },
  retryText: { color: PA.accent, fontSize: 15, fontWeight: '500' },
  div: { width: 1, backgroundColor: PA.hair },
  list: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair },
  row: { padding: 12 },
  dayChip: { width: 42, padding: 6, borderRadius: 8, flexShrink: 0 },
  monthLabel: { fontSize: 10, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  dayNum: { fontSize: 16, color: PA.ink, lineHeight: 20 },
  footer: { fontSize: 12, color: PA.ink3, paddingTop: 10, paddingHorizontal: 4, lineHeight: 18 },
});
