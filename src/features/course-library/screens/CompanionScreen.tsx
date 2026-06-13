import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';
import {
  getCurrentAssignment,
  presentAssignmentState,
  type AssignmentState,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { formatLessonCopy } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanionScreen'>;

const POLL_INTERVAL_MS = 2500;

function faceFor(state: AssignmentState | undefined): 'speak' | 'happy' | 'think' {
  if (state === 'COMPLETED') return 'happy';
  if (state === 'RUNNING') return 'speak';
  return 'think';
}

export default function CompanionScreen({ navigation, route }: Props) {
  const deviceId = route.params?.deviceId;
  const [assignment, setAssignment] = React.useState<CurrentAssignment | null>(null);
  // Same completion projection as RunningScreen: the current-assignment read
  // returns null the instant the lesson finishes (COMPLETED is not an ACTIVE
  // state), so a live→null transition is the terminal signal — the face must
  // switch to 'happy' rather than freezing on 'think'.
  const [finished, setFinished] = React.useState(false);
  const sawLiveRef = React.useRef(false);

  React.useEffect(() => {
    if (!deviceId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const current = await getCurrentAssignment(deviceId);
        if (!active) return;
        const live = current && current.state !== 'COMPLETED' && current.state !== 'FAILED' && current.state !== 'CANCELLED';
        if (live) {
          sawLiveRef.current = true;
          setAssignment(current);
          timer = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        // Terminal: either an explicit terminal-state object, or null after we
        // had observed a live assignment. Both mean the lesson is done — render
        // the completion UI and stop polling.
        if (current) setAssignment(current);
        const terminal =
          current?.state === 'COMPLETED' ||
          current?.state === 'FAILED' ||
          current?.state === 'CANCELLED' ||
          (current === null && sawLiveRef.current);
        if (terminal) {
          setFinished(true);
          return;
        }
        // Non-terminal: most importantly current===null && !sawLiveRef.current,
        // the read-after-write race right after createAssignment where the
        // assignment isn't visible yet. Keep polling — stopping here would
        // freeze the live face mirror on 'think' forever.
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [deviceId]);

  const completed = finished || assignment?.state === 'COMPLETED';
  const lessonTitle = assignment?.lessonTitle?.trim() ? assignment.lessonTitle : "Today's lesson";
  const presentation = completed
    ? presentAssignmentState('COMPLETED')
    : assignment
      ? presentAssignmentState(assignment.state)
      : null;
  const statusCopy = presentation
    ? formatLessonCopy(presentation.copy, { lesson: lessonTitle })
    : 'Lesson running on Robot';

  return (
    <DeviceShell title="What Robot sees" onBack={() => navigation.navigate(ROUTES.RunningScreen, { deviceId, assignmentId: assignment?.assignmentId })}>
      <Text style={styles.intro}>
        A live mirror of Robot's face. <Text fontWeight="600" style={{ color: CL.ink }}>No transcript</Text> — what your child says stays between them.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.lcdMirror} alignItems="center" gap={12}>
          <Box flexDirection="row" alignItems="center" gap={10} style={styles.liveRow}>
            <Box style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </Box>
          <LCDFace emotion={completed ? 'happy' : faceFor(assignment?.state)} size={220} accent="#FF6F61" />
          <Text fontWeight="600" style={styles.phaseLabel}>{statusCopy}</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.progressCard}>
          <Text fontWeight="600" style={styles.progressTitle}>{lessonTitle}</Text>
          <Text style={styles.progressMeta}>Robot is leading the lesson. You can put your phone away.</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>If you need to</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔉" title="Turn volume down" body="Currently at 6 of 10" />
          <DeviceRow icon="⏸️" title="Pause Robot gently" body="Robot will say 'Let's take a quick break'" />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  lcdMirror: { backgroundColor: '#0E1116', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 },
  liveRow: { alignSelf: 'flex-start' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF5454' },
  liveText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
  phaseLabel: { fontSize: 15, color: '#fff', marginTop: 4, textAlign: 'center' },
  progressCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  progressTitle: { fontSize: 13, color: CL.ink },
  progressMeta: { fontSize: 11, color: CL.ink2, marginTop: 4, lineHeight: 16 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
