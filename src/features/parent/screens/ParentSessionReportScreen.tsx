import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import type { ParentReportActivity } from '@/services/api/parentLearning.api';
import ParentScroll, { PA } from '../components/ParentScroll';
import { useParentSessionReportQuery } from '../hooks/useParentSessionReportQuery';
import { parentReportCategoryLabel, parentResponseClassLabel, parentSessionStateLabel, type ParentReportCategory } from '../parentLearningCopy';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSessionReportScreen'>;

export default function ParentSessionReportScreen({ navigation, route }: Props) {
  const { language } = useAppLanguage();
  const query = useParentSessionReportQuery(route.params.childId, route.params.sessionId);
  const back = () => navigation.navigate(ROUTES.ParentHistoryScreen);
  if (query.isLoading) return <ParentScroll title="Session report" onBack={back}><Message text="Loading session report" /></ParentScroll>;
  if (query.isError) return <ParentScroll title="Session report" onBack={back}><ErrorState retry={() => { void query.refetch(); }} /></ParentScroll>;
  const report = query.data;
  if (!report) return <ParentScroll title="Session report" onBack={back}><Message text="Session report not found" /></ParentScroll>;

  const minutes = Math.floor(report.durationSec / 60);
  const seconds = report.durationSec % 60;
  return (
    <ParentScroll title="Session report" onBack={back}>
      <Box padding={16} gap={12}>
        <Box style={styles.hero} gap={5}>
          <Text style={styles.course} i18n={false}>{report.courseTitle}</Text>
          <Text fontWeight="800" style={styles.lesson} i18n={false}>{report.lessonTitle}</Text>
          <Text style={styles.meta} i18n={false}>{translateTemplate('{{state}} · {{minutes}} min {{seconds}} sec', { state: parentSessionStateLabel(report.state, language), minutes, seconds }, { locale: language })}</Text>
        </Box>
        {report.objective ? <Section title="Lesson objective"><Text style={styles.body} i18n={false}>{report.objective}</Text></Section> : null}
        <Evidence title="Presented" values={report.presented} />
        <Evidence title="Attempted" values={report.attempted} />
        <Evidence title="Accepted" values={report.accepted} />
        <Evidence title="Needs review" values={report.needsReview} />
        {report.activities.length > 0 ? <Section title="Activity outcomes">{report.activities.map(activity => <Activity key={activity.stepId} activity={activity} />)}</Section> : null}
        {report.reward ? <Section title="Reward earned"><Text style={styles.body} i18n={false}>{translateTemplate('{{xp}} XP · {{stars}} stars', { xp: report.reward.xp, stars: report.reward.stars }, { locale: language })}</Text></Section> : null}
        {report.suggestedNextLesson ? <Section title="Suggested next lesson"><Text fontWeight="700" style={styles.body} i18n={false}>{report.suggestedNextLesson.lessonTitle}</Text></Section> : null}
      </Box>
    </ParentScroll>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) { return <Box style={styles.card} gap={8}><Text fontWeight="800" style={styles.heading}>{title}</Text>{children}</Box>; }
function Evidence({ title, values }: { title: ParentReportCategory; values: string[] }) { const { language } = useAppLanguage(); return <Section title={parentReportCategoryLabel(title, language)}><Text style={styles.body} i18n={false}>{values.length > 0 ? values.join(', ') : '—'}</Text></Section>; }
function Activity({ activity }: { activity: ParentReportActivity }) { const { language } = useAppLanguage(); const response = parentResponseClassLabel(activity.finalResponseClass ?? activity.outcome, language); return <Box gap={3}><Text fontWeight="700" style={styles.body} i18n={false}>{activity.activityTitle}</Text>{activity.subject ? <Text style={styles.meta} i18n={false}>{activity.subject}</Text> : null}<Text style={styles.meta} i18n={false}>{translateTemplate('{{attempts}} attempts · {{outcome}}', { attempts: activity.attempts, outcome: response }, { locale: language })}</Text></Box>; }
function Message({ text }: { text: string }) { return <Box padding={24}><Text style={styles.meta}>{text}</Text></Box>; }
function ErrorState({ retry }: { retry: () => void }) { return <Box padding={24} gap={12}><Text fontWeight="800" style={styles.error}>Session report is offline</Text><Text style={styles.meta}>Check your connection and try again.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry session report" onPress={retry}><Text fontWeight="700" style={styles.link}>Retry</Text></TouchableOpacity></Box>; }

const styles = StyleSheet.create({
  hero: { padding: 18, borderRadius: 16, backgroundColor: '#E7F5EE' }, card: { padding: 15, borderRadius: 15, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair },
  course: { color: PA.ink2, fontSize: 13 }, lesson: { color: PA.ink, fontSize: 23 }, heading: { color: PA.ink, fontSize: 15 }, body: { color: PA.ink, fontSize: 14, lineHeight: 20 }, meta: { color: PA.ink2, fontSize: 13 }, error: { color: PA.ink, fontSize: 20 }, link: { color: PA.accent },
});
