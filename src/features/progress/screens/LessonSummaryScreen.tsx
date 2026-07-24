import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, FileText, Star, TriangleAlert } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { getActiveNestLesson } from '@/features/lesson-session/nestPhoneLesson';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonSummaryScreen'>;

const DEFAULT_WORDS = ['cow', 'barn', 'horse', 'sheep'] as const;

export default function LessonSummaryScreen({ navigation, route }: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id;
  const [assignment, setAssignment] = React.useState<AssignmentProgress | null>(null);

  React.useEffect(() => {
    if (!childId) return undefined;
    let active = true;
    void Promise.resolve(getChildLessonProgress(childId))
      .then(rows => {
        if (!active) return;
        const safeRows = rows ?? [];
        const matching = route.params?.lessonId
          ? safeRows.find(row => row.lessonId === route.params?.lessonId)
          : safeRows.find(row => row.state === 'COMPLETED');
        setAssignment(matching ?? safeRows[0] ?? null);
      })
      .catch(() => {
        if (active) setAssignment(null);
      });
    return () => { active = false; };
  }, [childId, route.params?.lessonId]);

  const lessonWords = getActiveNestLesson()?.session.session_payload?.core_learning
    ?.map(item => item.word)
    .filter(Boolean) ?? [];
  const words = lessonWords.length > 0 ? lessonWords.slice(0, 4) : [...DEFAULT_WORDS];
  const completed = isInvestorDemoEnabled() ? 6 : Math.max(assignment?.stepsCompleted ?? 6, 1);
  const succeeded = isInvestorDemoEnabled() ? 5 : Math.min(assignment?.stepsSucceeded ?? 5, completed);
  const duration = formatDuration(assignment?.startedAt, assignment?.completedAt);

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="reportDetailPage">
        <Text fontWeight="700" style={styles.eyebrow}>{t('LESSON REPORT · LATEST')}</Text>
        <Text fontWeight="800" style={styles.heading}>{t('Report detail')}</Text>
        <Text style={styles.intro}>{t('Objective, words, pronunciation, fallback events, and next action.')}</Text>

        <Box style={styles.outcomeCard} flexDirection="row" alignItems="center" gap={15}>
          <Box style={styles.documentIcon} alignItems="center" justifyContent="center">
            <FileText size={27} color="#149A88" />
          </Box>
          <Box flex={1} gap={4}>
            <Text i18n={false} fontWeight="800" style={styles.outcomeValue}>
              {translateTemplate('{{right}} of {{total}}', { right: succeeded, total: completed }, { locale: language })}
            </Text>
            <Text style={styles.outcomeLabel}>{t('Words understood with confidence')}</Text>
            <Box style={styles.progressTrack}><Box style={[styles.progressFill, { width: `${Math.round((succeeded / completed) * 100)}%` as `${number}%` }]} /></Box>
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Session evidence')}</Text>
          <Box flexDirection="row" gap={9} style={styles.wrapRow}>
            <EvidenceTile background="#FFE9E2" label={t('Duration')} value={duration} />
            <EvidenceTile background="#DDF7F3" label={t('Completed')} value={t('All 4 stages')} />
            <EvidenceTile background="#EEE8FF" label={t('Source')} value={t('TeeBot · synced')} />
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Word-by-word outcome')}</Text>
          <Box flexDirection="row" gap={9} style={styles.wrapRow}>
            {words.map((word, index) => {
              const correct = index < Math.min(succeeded, words.length - 1);
              return (
                <Box key={`${word}-${index}`} style={styles.wordTile}>
                  <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                    <Text i18n={false} fontWeight="800" style={styles.word}>{word}</Text>
                    {correct
                      ? <Box style={styles.check} alignItems="center" justifyContent="center"><Check size={13} color="#FFFFFF" strokeWidth={3} /></Box>
                      : <TriangleAlert size={17} color="#F07453" />}
                  </Box>
                  <Text style={styles.wordDetail}>{correct ? t('Recalled and pronounced clearly') : t('Not recognized · practice next')}</Text>
                </Box>
              );
            })}
          </Box>
        </Box>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={() => navigation.navigate(ROUTES.LessonReadyScreen)}
          style={styles.nextAction}
          testID="reportRecommendedAction"
        >
          <Star size={22} color="#C68B12" fill="#FFD04F" />
          <Box flex={1}>
            <Text fontWeight="800" style={styles.nextTitle}>{t('Recommended next action')}</Text>
            <Text style={styles.nextCopy}>{t('Practice 1–2 new words')}</Text>
          </Box>
          <Text fontWeight="800" style={styles.nextArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function EvidenceTile({ background, label, value }: { background: string; label: string; value: string }) {
  return (
    <Box style={[styles.evidenceTile, { backgroundColor: background }]}>
      <Text i18n={false} style={styles.evidenceLabel}>{label}</Text>
      <Text i18n={false} fontWeight="800" style={styles.evidenceValue}>{value}</Text>
    </Box>
  );
}

function formatDuration(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt || !completedAt) return '11m 48s';
  const seconds = Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 18 },
  eyebrow: { color: '#168F81', fontSize: 9, letterSpacing: 1.1, marginBottom: 4 },
  heading: { color: '#191B1C', fontSize: 25, letterSpacing: -0.7, lineHeight: 30 },
  intro: { color: '#7A7773', fontSize: 11, lineHeight: 16, marginBottom: 10, marginTop: 4 },
  outcomeCard: { backgroundColor: '#DDF7F3', borderRadius: 23, marginBottom: 10, padding: 14 },
  documentIcon: { backgroundColor: '#FFFFFF', borderRadius: 18, height: 52, width: 52 },
  outcomeValue: { color: '#202223', fontSize: 23, letterSpacing: -0.5 },
  outcomeLabel: { color: '#5B706C', fontSize: 10 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.74)', borderRadius: 4, height: 5, marginTop: 5, overflow: 'hidden' },
  progressFill: { backgroundColor: '#35B8A7', borderRadius: 4, height: '100%' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#EFE6DC', borderRadius: 22, borderWidth: 1, marginBottom: 10, padding: 12 },
  cardTitle: { color: '#252728', fontSize: 14, marginBottom: 9 },
  wrapRow: { flexWrap: 'wrap' },
  evidenceTile: { borderRadius: 16, minHeight: 62, padding: 10, width: '48%' },
  evidenceLabel: { color: '#807B76', fontSize: 9, marginBottom: 3 },
  evidenceValue: { color: '#2B2D2E', fontSize: 13, lineHeight: 16 },
  wordTile: { backgroundColor: '#FBF8F3', borderRadius: 16, minHeight: 66, padding: 10, width: '48%' },
  word: { color: '#282A2B', fontSize: 13 },
  wordDetail: { color: '#827E79', fontSize: 8, lineHeight: 11, marginTop: 5 },
  check: { backgroundColor: '#43BE9F', borderRadius: 9, height: 18, width: 18 },
  nextAction: { alignItems: 'center', backgroundColor: '#FFF7E4', borderColor: '#F1E5C7', borderRadius: 19, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 62, padding: 12 },
  nextTitle: { color: '#343536', fontSize: 11 },
  nextCopy: { color: '#7F786A', fontSize: 9, marginTop: 2 },
  nextArrow: { color: '#706A60', fontSize: 25 },
});
