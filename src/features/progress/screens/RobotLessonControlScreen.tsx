import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { type RootStackParamList } from '@/navigation/routes';
import client from '@/services/http/client';
import { colors, radius, spacing, typography } from '@/design-system/tokens/legacy-semantic';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotLessonControlScreen'>;

interface LessonStatus {
  sessionId: string;
  deviceId: string;
  childId: string;
  lessonId: string;
  state: string;
  startedAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = Reflect.get(error, 'message');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export default function RobotLessonControlScreen({ route }: Props): React.JSX.Element {
  const params = route.params ?? {};
  const [deviceId] = React.useState(params.deviceId ?? '');
  const [lessonId] = React.useState(params.lessonId ?? 'w01-d01-hello-name');
  const [sessionIndex] = React.useState(params.sessionIndex ?? 1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [activeSession, setActiveSession] = React.useState<LessonStatus | null>(null);
  const statusPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = React.useCallback(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
  }, []);

  const startLesson = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await client.post<LessonStatus & { errorReason?: string }>('/robot-lessons/start', {
        deviceId: deviceId || 'dev-123',
        childId: 'demo-child',
        lessonId,
        sessionIndex,
        childName: 'friend',
        ageBand: '7-9',
      });
      const data = response.data;
      if (data.state === 'active' || data.state === 'starting') {
        setActiveSession(data);
        clearPoll();
        statusPollRef.current = setInterval(async () => {
          try {
            const statusResponse = await client.get<LessonStatus>(`/robot-lessons/${data.sessionId}/status`);
            setActiveSession(statusResponse.data);
          } catch {
            // Status polling is best-effort; the explicit stop action still reports errors.
          }
        }, 3000);
      } else {
        setError(data.errorReason ?? 'Failed to start lesson');
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to start lesson on robot'));
    } finally {
      setLoading(false);
    }
  }, [clearPoll, deviceId, lessonId, sessionIndex]);

  const stopLesson = React.useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await client.post(`/robot-lessons/${activeSession.sessionId}/stop`);
      const statusResponse = await client.get<LessonStatus>(`/robot-lessons/${activeSession.sessionId}/status`);
      setActiveSession(statusResponse.data);
      clearPoll();
    } catch (err) {
      setError(errorMessage(err, 'Failed to stop lesson'));
    } finally {
      setLoading(false);
    }
  }, [activeSession, clearPoll]);

  React.useEffect(() => clearPoll, [clearPoll]);

  const isActive = activeSession && (activeSession.state === 'active' || activeSession.state === 'starting');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Robot Lesson</Text>
      <Text style={styles.title}>Voice Lesson on TBOT</Text>
      <Text style={styles.subtitle}>Send a structured English lesson to the robot and monitor the session state.</Text>

      {isActive ? (
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Lesson Active</Text>
          </View>
          <Text style={styles.cardLabel}>Session</Text>
          <Text style={styles.cardValue}>{activeSession.sessionId}</Text>
          <Text style={styles.cardLabel}>Lesson</Text>
          <Text style={styles.cardValue}>{activeSession.lessonId}</Text>
          <Text style={styles.cardLabel}>Device</Text>
          <Text style={styles.cardValue}>{activeSession.deviceId}</Text>
          <Button label={loading ? 'Stopping...' : 'Stop Lesson'} onPress={stopLesson} disabled={loading} variant="danger" style={styles.stopButton} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Lesson Selection</Text>
          <Text style={styles.detail}>Session Index: {sessionIndex}</Text>
          <Text style={styles.detail}>Lesson ID: {lessonId}</Text>
          <Text style={styles.detail}>Device: {deviceId || 'dev-123'}</Text>
          <Button label={loading ? 'Starting...' : 'Start Lesson on Robot'} onPress={startLesson} disabled={loading} style={styles.primaryButton} />
          {loading ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoBody}>1. The app sends the lesson plan to the backend.</Text>
        <Text style={styles.infoBody}>2. Backend converts it to a teaching prompt.</Text>
        <Text style={styles.infoBody}>3. Robot receives the prompt through its session channel.</Text>
        <Text style={styles.infoBody}>4. The child hears the lesson and answers out loud.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { ...typography.caption, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.xs },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs, marginTop: spacing.md },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  cardValue: { ...typography.body1, color: colors.textPrimary },
  detail: { ...typography.body1, color: colors.textSecondary },
  primaryButton: { marginTop: spacing.md },
  stopButton: { marginTop: spacing.md },
  spinner: { marginTop: spacing.sm },
  error: { ...typography.body1, color: colors.error, marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  statusText: { ...typography.body1, color: colors.success, fontWeight: '600' },
  infoTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  infoBody: { ...typography.body1, color: colors.textSecondary },
});
