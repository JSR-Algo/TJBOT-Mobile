import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PA } from '../components/ParentScroll';
import { getParentToday } from '@/services/api/parent.api';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentTodayScreen'>;
type TodayErrorState = { title: string; detail: string };

const WORD_ROWS = [
  { w: 'Hello',  s: 'getting stronger' },
  { w: 'Cat',    s: 'getting stronger' },
  { w: 'Happy',  s: 'new this week' },
  { w: 'Friend', s: 'visit again soon' },
  { w: 'Dog',    s: 'visit again soon' },
] as const;

export default function ParentTodayScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentTodayScreen);
  const { language, t } = useAppLanguage();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorState, setErrorState] = React.useState<TodayErrorState>({
    title: 'Today summary unavailable',
    detail: 'Try again.',
  });

  const loadToday = React.useCallback(() => {
    let active = true;
    setStatus('loading');
    getParentToday()
      .then((today) => {
        if (active) {
          setStatus(today && typeof today === 'object' ? 'success' : 'error');
        }
      })
      .catch((error) => {
        if (active) {
          setErrorState(classifyTodayError(error));
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(loadToday, [loadToday]);

  if (status === 'loading') {
    return (
      <ParentScroll title="Today" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
        <Box paddingHorizontal={24} paddingTop={40}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Back to Parent Space')}
            onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
            activeOpacity={0.7}
          >
            <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500', marginBottom: 12 }}>Back to Parent Space</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: PA.ink3 }}>Loading today's progress</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (status === 'error') {
    return (
      <ParentScroll title="Today" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Back to Parent Space')}
            onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
            activeOpacity={0.7}
          >
            <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Back to Parent Space</Text>
          </TouchableOpacity>
          <Text fontWeight="700" style={{ fontSize: 20, color: PA.ink }}>{errorState.title}</Text>
          <Text style={{ fontSize: 13, color: PA.ink3 }}>{errorState.detail}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={translateTemplate('Retry {{title}}', { title: t(errorState.title) }, { locale: language })}
            onPress={() => { loadToday(); }}
            activeOpacity={0.7}
          >
            <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  return (
    <ParentScroll title="Today" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Back to Parent Space')}
          onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
          activeOpacity={0.7}
        >
          <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500', marginBottom: 12 }}>Back to Parent Space</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 13, color: PA.ink3, marginBottom: 6 }}>Tuesday, Mar 12 · 4:12 PM</Text>
        <Text fontWeight="600" style={{ fontSize: 20, color: PA.ink, letterSpacing: -0.3, lineHeight: 28, marginBottom: 18 }}>
          Mira practiced greetings, feelings, and three new words.
        </Text>
      </Box>

      <PRowGroup header="Lesson">
        <PRow icon="📖" label="How are you?" value="Unit 3 · Lesson 3" />
        <PRow icon="⏱" label="Time on task" value="8 min" />
        <PRow icon="🎤" label="Speaking turns" value="8" isLast />
      </PRowGroup>

      <PRowGroup
        header="Words practiced"
        footer="We don't store voice recordings or transcripts. These summaries are generated from lesson activity."
      >
        {WORD_ROWS.map((r, i) => (
          <PRow key={r.w} label={r.w} value={r.s} isLast={i === WORD_ROWS.length - 1} />
        ))}
      </PRowGroup>

      <PRowGroup header="What's next">
        <PRow icon="→" label="Continue Unit 3" value="Lesson 4" chevron />
        <PRow icon="↻" label="Review 2 words" chevron isLast />
      </PRowGroup>

      <Box height={24} />
    </ParentScroll>
  );
}

function classifyTodayError(error: unknown): TodayErrorState {
  const shaped = error as { code?: string; message?: string };
  if (shaped.code === 'NETWORK_ERROR' && shaped.message?.includes('timeout')) {
    return { title: 'Today summary timed out', detail: 'Try again.' };
  }
  return { title: 'Today summary unavailable', detail: 'Try again.' };
}
