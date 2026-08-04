import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { Text } from '@/design-system/primitives';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { INVESTOR_DEMO_DEVICE } from '@/demo/investorDemoSeed';
import type { RootStackParamList } from '@/navigation/routes';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import {
  getRobotLessonStatus,
  startRobotLesson,
  stopRobotLesson,
  type RobotLessonStatus,
} from '@/services/connectors/lesson-delivery.connector';
import type { RobotLinkState } from '@/services/connectors/types';
import { colors, radius, spacing, typography } from '@/theme';
import { useRobotLessonStatusPoll } from '@/hooks/useRobotLessonStatusPoll';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotLessonControlScreen'>;


export function RobotLessonControlScreen({ route }: Props): React.JSX.Element {
  const params = route.params || {};
  const household = useOptionalHousehold();
  const simulated = isInvestorDemoEnabled();
  const deviceId = params.deviceId || (simulated ? INVESTOR_DEMO_DEVICE.id : '');
  const childId = household?.activeChild?.id || '';
  const lessonId = params.lessonId || 'w01-d01-hello-greetings';
  const sessionIndex = params.sessionIndex || 1;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedState, setBlockedState] = useState<RobotLinkState | null>(null);
  const [retryAction, setRetryAction] = useState<'start' | 'stop' | null>(null);
  const [activeSession, setActiveSession] = useState<RobotLessonStatus | null>(null);
  const { startPoll, stopPoll } = useRobotLessonStatusPoll({
    onStatus: setActiveSession,
    onError: (pollError) => setError(pollError instanceof Error ? pollError.message : 'Lesson status refresh failed'),
  });

  const startLesson = useCallback(async () => {
    if (!deviceId || !childId) return;
    setLoading(true);
    setError('');
    setBlockedState(null);
    try {
      const result = await startRobotLesson({
        deviceId,
        childId,
        lessonId,
        sessionIndex,
        childName: household?.activeChild?.name,
      });
      if (result.state !== 'ok') {
        setBlockedState(result.state);
        setRetryAction('start');
        return;
      }
      const session = result.value;
      if (session.state !== 'active' && session.state !== 'starting') {
        setError(session.errorReason || 'Failed to start lesson');
        return;
      }
      setRetryAction(null);
      setActiveSession(session);
      startPoll(session.sessionId);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to start lesson on robot');
    } finally {
      setLoading(false);
    }
  }, [childId, deviceId, household?.activeChild?.name, lessonId, sessionIndex, startPoll]);

  const stopLesson = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    setError('');
    setBlockedState(null);
    try {
      const stopResult = await stopRobotLesson(activeSession.sessionId);
      if (stopResult.state !== 'ok') {
        setBlockedState(stopResult.state);
        setRetryAction('stop');
        return;
      }
      const statusResult = await getRobotLessonStatus(activeSession.sessionId);
      if (statusResult.state !== 'ok') {
        setBlockedState(statusResult.state);
        setRetryAction('stop');
        return;
      }
      setRetryAction(null);
      setActiveSession(statusResult.value);
      stopPoll();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to stop lesson');
    } finally {
      setLoading(false);
    }
  }, [activeSession, stopPoll]);

  const retry = retryAction === 'stop' ? stopLesson : startLesson;
  const isActive = activeSession && (activeSession.state === 'active' || activeSession.state === 'starting');

  if (!deviceId || !childId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Robot Lesson</Text>
        <Text style={styles.title}>Voice Lesson on TBOT</Text>
        <ConnectorStateNotice state="not_connected" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Robot Lesson</Text>
      <Text style={styles.title}>Voice Lesson on TBOT</Text>
      <Text style={styles.subtitle}>
        Send a structured English lesson to the physical robot. The robot will speak and listen using Gemini Live.
      </Text>
      {simulated ? <Text style={styles.simulatedBadge}>Simulated</Text> : null}

      {blockedState ? <ConnectorStateNotice state={blockedState} onRetry={retry} /> : null}

      {isActive ? (
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Lesson Active</Text>
          </View>
          <Text style={styles.cardLabel}>Session</Text>
          <Text style={styles.cardValue}>{activeSession?.sessionId}</Text>
          <Text style={styles.cardLabel}>Lesson</Text>
          <Text style={styles.cardValue}>{activeSession?.lessonId}</Text>
          <Text style={styles.cardLabel}>Device</Text>
          <Text style={styles.cardValue}>{activeSession?.deviceId}</Text>
          <Text style={styles.cardLabel}>Started</Text>
          <Text style={styles.cardValue}>{new Date(activeSession?.startedAt || '').toLocaleTimeString()}</Text>

          <Button
            label={loading ? 'Stopping...' : 'Stop Lesson'}
            onPress={stopLesson}
            disabled={loading}
            style={styles.stopButton}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Lesson Selection</Text>
          <Text style={styles.detail}>Session Index: {sessionIndex}</Text>
          <Text style={styles.detail}>Lesson ID: {lessonId}</Text>
          <Text style={styles.detail}>Device: {deviceId}</Text>

          <Button
            label={loading ? 'Starting...' : 'Start Lesson on Robot'}
            onPress={startLesson}
            disabled={loading}
            style={styles.primaryButton}
          />
          {loading && <ActivityIndicator style={styles.spinner} color={colors.primary} />}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoBody}>1. The app sends the lesson plan to the backend.</Text>
        <Text style={styles.infoBody}>2. Backend converts it to a teaching prompt.</Text>
        <Text style={styles.infoBody}>3. Robot receives the prompt via WebSocket.</Text>
        <Text style={styles.infoBody}>4. Robot speaks the lesson through Gemini Live.</Text>
        <Text style={styles.infoBody}>5. Child talks back — Gemini listens and responds.</Text>
      </View>
    </ScrollView>
  );
}

export default RobotLessonControlScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { ...typography.caption, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.xs },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  simulatedBadge: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  cardValue: { ...typography.body, color: colors.textPrimary },
  detail: { ...typography.body, color: colors.textSecondary },
  primaryButton: { marginTop: spacing.md },
  stopButton: { marginTop: spacing.md, backgroundColor: colors.error },
  spinner: { marginTop: spacing.sm },
  error: { ...typography.body, color: colors.error, marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  statusText: { ...typography.body, color: colors.success, fontWeight: '600' },
  infoTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  infoBody: { ...typography.body, color: colors.textSecondary },
});
