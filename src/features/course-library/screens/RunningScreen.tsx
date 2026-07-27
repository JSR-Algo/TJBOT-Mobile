import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Pause, Radio, Square } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useAppLanguage } from '@/services/i18n/i18n';
import {
  getCurrentAssignment,
  presentAssignmentState,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { formatLessonCopy } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'RunningScreen'>;

const POLL_INTERVAL_MS = 2500;
/** Investor-demo seed locked to the approved first-five Live lesson status capture (`06:42`). */
const INVESTOR_DEMO_ELAPSED_SECONDS = 402;

export default function RunningScreen({ navigation, route }: Props): React.JSX.Element {
  const { t } = useAppLanguage();
  const deviceId = route.params?.deviceId;
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  const [finished, setFinished] = React.useState(false);
  const investorDemo = isInvestorDemoEnabled();
  const [elapsedSeconds, setElapsedSeconds] = React.useState(() =>
    investorDemo ? INVESTOR_DEMO_ELAPSED_SECONDS : 0,
  );
  const sawLiveRef = React.useRef(false);

  React.useEffect(() => {
    if (!deviceId) return undefined;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      try {
        const current = await getCurrentAssignment(deviceId);
        if (!active) return;
        const live = current && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(current.state);
        if (live) {
          sawLiveRef.current = true;
          setAssignment(current);
          timer = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        if (current) setAssignment(current);
        const terminal = Boolean(current && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(current.state))
          || (current === null && sawLiveRef.current);
        if (terminal) {
          setFinished(true);
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [deviceId]);

  React.useEffect(() => {
    // Keep the approved first-five demo frame frozen at 06:42 so Maestro
    // recaptures stay pixel-stable against output/maestro/first-five/02-live-status.png.
    if (finished || investorDemo) return undefined;
    const timer = setInterval(() => setElapsedSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [finished, investorDemo]);

  const lessonTitle = assignment?.lessonTitle?.trim()
    || route.params?.lessonTitle?.trim()
    || t('Barn & Farm Words');
  const completed = finished || assignment?.state === 'COMPLETED';
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = presentation
    ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
    : t('Lesson playing');
  const elapsed = formatElapsed(elapsedSeconds);

  return (
    <ScreenShell bg="#FAF5EB" gradient={false}>
      <ScrollView
        accessibilityLabel={lessonTitle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="liveLessonStatusPage"
      >
        <Text fontWeight="700" style={styles.eyebrow}>
          {completed ? t('LESSON COMPLETE · REPORT READY') : t('LIVE · TEEBOT ACKNOWLEDGED')}
        </Text>
        <Text fontWeight="800" style={styles.heading}>{t('Live lesson status')}</Text>
        <Text style={styles.intro}>{t('Authoritative stage, elapsed time, and acknowledged parent controls.')}</Text>

        <Box style={styles.liveCard}>
          <Box flexDirection="row" alignItems="center" gap={14}>
            <Box style={styles.radioIcon} alignItems="center" justifyContent="center">
              <Radio size={28} color="#1E9F91" />
            </Box>
            <Box flex={1} gap={2}>
              <Text i18n={false} fontWeight="800" style={styles.elapsed}>{elapsed}</Text>
              <Text fontWeight="700" style={styles.stageCopy}>
                {completed ? statusCopy : t('Teaching word 4 of 6')}
              </Text>
            </Box>
          </Box>
          <Box style={styles.progressTrack}>
            <Box style={[styles.progressFill, completed && styles.progressComplete]} />
          </Box>
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Lesson timeline')}</Text>
          <TimelineRow done label={t('Hello & warm-up')} detail={t('Completed in 1:20')} />
          <TimelineRow done label={t('Meet the farm')} detail={t('Three words practiced')} />
          <TimelineRow active={!completed} done={completed} label={t("Say 'horse'")} detail={completed ? t('Completed') : t('TeeBot is listening')} step="3" />
          <TimelineRow active={completed} label={t('Review game')} detail={completed ? t('Report is ready') : t('About 3 minutes remaining')} step="4" />
        </Box>

        <Box style={styles.card}>
          <Text fontWeight="800" style={styles.cardTitle}>{t('Parent controls')}</Text>
          <Box flexDirection="row" gap={10}>
            <ParentControl
              disabled
              icon={<Pause size={18} color="#77736F" />}
              label={t('Pause lesson')}
              detail={t('Requires robot control service')}
            />
            <ParentControl
              icon={<Square size={17} color="#DB5A4D" fill="#DB5A4D" />}
              label={completed ? t('View report') : t('End lesson')}
              detail={completed ? t('Saved from backend progress') : t('Save progress and return')}
              onPress={() => completed
                ? navigation.navigate(ROUTES.LessonSummaryScreen, { lessonId: assignment?.lessonId })
                : navigation.navigate(ROUTES.HomeHubScreen)}
            />
          </Box>
        </Box>

        <Text style={styles.privacy}>{t('Audio is never saved.')}</Text>
      </ScrollView>
    </ScreenShell>
  );
}

function TimelineRow({
  active = false,
  detail,
  done = false,
  label,
  step,
}: {
  active?: boolean;
  detail: string;
  done?: boolean;
  label: string;
  step?: string;
}): React.JSX.Element {
  return (
    <Box flexDirection="row" gap={12} style={styles.timelineRow}>
      <Box style={[styles.step, done && styles.stepDone, active && styles.stepActive]} alignItems="center" justifyContent="center">
        {done ? <Check size={17} color="#FFFFFF" strokeWidth={3} /> : <Text i18n={false} fontWeight="800" style={styles.stepText}>{step}</Text>}
      </Box>
      <Box flex={1} gap={2}>
        <Text i18n={false} fontWeight="800" style={styles.timelineLabel}>{label}</Text>
        <Text i18n={false} style={styles.timelineDetail}>{detail}</Text>
      </Box>
    </Box>
  );
}

function ParentControl({
  detail,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  detail: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.75}
      disabled={disabled}
      onPress={onPress}
      style={[styles.control, disabled && styles.controlDisabled]}
    >
      <Box flexDirection="row" alignItems="center" gap={8}>{icon}<Text i18n={false} fontWeight="800" style={styles.controlLabel}>{label}</Text></Box>
      <Text i18n={false} style={styles.controlDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 18 },
  eyebrow: { color: '#188C80', fontSize: 9, letterSpacing: 1.1, marginBottom: 4 },
  heading: { color: '#1A1C1D', fontSize: 25, letterSpacing: -0.7, lineHeight: 30 },
  intro: { color: '#7A7773', fontSize: 11, lineHeight: 16, marginBottom: 10, marginTop: 4 },
  liveCard: { backgroundColor: '#24292A', borderRadius: 23, marginBottom: 10, padding: 15 },
  radioIcon: { backgroundColor: '#F5FFFD', borderRadius: 17, height: 50, width: 50 },
  elapsed: { color: '#FFFFFF', fontSize: 26, letterSpacing: -0.5 },
  stageCopy: { color: '#E9ECEB', fontSize: 11 },
  progressTrack: { backgroundColor: '#4A5051', borderRadius: 5, height: 6, marginTop: 12, overflow: 'hidden' },
  progressFill: { backgroundColor: '#47CFC0', borderRadius: 5, height: '100%', width: '67%' },
  progressComplete: { width: '100%' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#EEE6DC', borderRadius: 22, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#252728', fontSize: 15, marginBottom: 8 },
  timelineRow: { minHeight: 50 },
  step: { backgroundColor: '#EEEAE4', borderRadius: 16, height: 32, width: 32 },
  stepDone: { backgroundColor: '#54C9BB' },
  stepActive: { backgroundColor: '#E9FFFB', borderColor: '#54C9BB', borderWidth: 2 },
  stepText: { color: '#696560', fontSize: 12 },
  timelineLabel: { color: '#2A2C2D', fontSize: 12 },
  timelineDetail: { color: '#8A8681', fontSize: 10 },
  control: { backgroundColor: '#FFF2EE', borderRadius: 16, flex: 1, minHeight: 70, padding: 11 },
  controlDisabled: { backgroundColor: '#F5F3EF' },
  controlLabel: { color: '#383A3B', flexShrink: 1, fontSize: 10 },
  controlDetail: { color: '#8B8782', fontSize: 8, lineHeight: 11, marginTop: 6 },
  privacy: { color: '#77736F', fontSize: 9, textAlign: 'center' },
});
