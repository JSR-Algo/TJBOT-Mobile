import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import WaveBars from '@/design-system/components/WaveBars';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { isInvestorDemoEnabled } from '@/config/investorDemo';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { ROUTES } from '@/navigation/routes';
import { bootstrapNestPhoneLesson } from '../nestPhoneLesson';
import { useLessonSessionActor } from '../sessionContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectingScreen'>;
type SessionRoute =
  | typeof ROUTES.GreetingScreen
  | typeof ROUTES.ReconnectingScreen
  | typeof ROUTES.AudioErrorScreen;

function createIdempotencyKey(): string {
  return `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ConnectingScreen({ navigation }: Props) {
  const actor = useLessonSessionActor();
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id ?? null;
  const lastNavigatedRouteRef = React.useRef<SessionRoute | null>(null);
  const sessionBootstrapRef = React.useRef(false);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const emitStarted = (sessionId: string, deviceSessionId: string) => {
      if (cancelled || sessionBootstrapRef.current) return;
      if (!actor.getSnapshot().matches('CONNECTING')) return;
      sessionBootstrapRef.current = true;
      timer = setTimeout(() => {
        if (cancelled) return;
        actor.send({
          type: 'SESSION_STARTED',
          sessionId,
          deviceSessionId,
        });
      }, 600);
    };

    const maybeBootstrap = async () => {
      if (sessionBootstrapRef.current) return;
      if (!actor.getSnapshot().matches('CONNECTING')) return;

      // Investor demo: synthetic ids, no Nest.
      if (isInvestorDemoEnabled()) {
        emitStarted('demo-session', 'demo-device-session');
        return;
      }

      // Nest-only phone path: load session/today, then enter ACTIVE without robot.
      if (!childId) return;
      try {
        const nest = await bootstrapNestPhoneLesson(childId);
        if (cancelled) return;
        emitStarted(nest.sessionId, `phone-nest-${nest.sessionId}`);
      } catch {
        // Leave CONNECTING; navigation effect may surface AUDIO_FAILED later.
      }
    };

    const snapshot = actor.getSnapshot();
    if (snapshot.matches('IDLE')) {
      actor.send({ type: 'START_SESSION', idempotencyKey: createIdempotencyKey() });
    }

    void maybeBootstrap();
    const subscription = actor.subscribe(() => {
      void maybeBootstrap();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [actor, childId]);

  React.useEffect(() => {
    const routeForState = (value: unknown): SessionRoute | null => {
      if (value === 'RECONNECTING') return ROUTES.ReconnectingScreen;
      if (value === 'AUDIO_FAILED') return ROUTES.AudioErrorScreen;
      if (typeof value === 'object' && value !== null && 'ACTIVE' in value) {
        return ROUTES.GreetingScreen;
      }
      return null;
    };

    const navigateToRoute = (route: SessionRoute) => {
      if (route === ROUTES.GreetingScreen) {
        navigation.navigate(ROUTES.GreetingScreen);
      } else if (route === ROUTES.ReconnectingScreen) {
        navigation.navigate(ROUTES.ReconnectingScreen);
      } else {
        navigation.navigate(ROUTES.AudioErrorScreen);
      }
    };

    const syncRoute = (snapshot: { value: unknown }) => {
      const nextRoute = routeForState(snapshot.value);
      if (!nextRoute || lastNavigatedRouteRef.current === nextRoute) return;
      lastNavigatedRouteRef.current = nextRoute;
      navigateToRoute(nextRoute);
    };

    syncRoute(actor.getSnapshot());
    const subscription = actor.subscribe(syncRoute);
    return () => subscription.unsubscribe();
  }, [actor, navigation]);

  return (
    <ScreenShell bg="#E8F4FF">
      <Box accessible accessibilityLabel="Robot connection is tuning in" flex={1}>
        <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={28}>
          <Robot emotion="curious" size={220} />
          <Text fontWeight="700" style={styles.title}>Tuning in…</Text>
          <Box accessible accessibilityLabel="Connection activity">
            <WaveBars color="#6FC1FF" height={28} count={10} />
          </Box>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, color: '#1A1A1F' },
});
