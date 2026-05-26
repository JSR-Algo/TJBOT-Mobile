import React from 'react';
import { BackHandler } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';

// Hardware-back guard for active in-lesson voice screens
// (RobotListening / UserSpeaking / RobotSpeaking / Thinking).
// Android hardware back during a lesson must funnel through ExitConfirm
// so the child cannot drop out mid-turn by accident — the spec treats all
// non-terminal exits as confirmation-gated.
//
// Terminal / exit screens (LessonDone, AbandonedDisconnect, TimedOut,
// ExitConfirm itself) must NOT use this hook — back from those is the
// expected return-to-home path.
export function useLessonHardwareBack(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  voiceStateForResume: string,
): void {
  React.useEffect(() => {
    let hardwareSubscription: { remove: () => void } | null = null;

    const onBackPress = (): boolean => {
      navigation.navigate(ROUTES.ExitConfirmScreen, {
        voiceStateBeforeInterruption: voiceStateForResume,
        resumeReason: 'exit_confirm',
      });
      return true;
    };

    const attach = (): void => {
      hardwareSubscription?.remove();
      hardwareSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    };
    const detach = (): void => {
      hardwareSubscription?.remove();
      hardwareSubscription = null;
    };

    const focusUnsubscribe = navigation.addListener?.('focus', attach);
    const blurUnsubscribe = navigation.addListener?.('blur', detach);
    if (!focusUnsubscribe) attach();

    return () => {
      detach();
      focusUnsubscribe?.();
      blurUnsubscribe?.();
    };
  }, [navigation, voiceStateForResume]);
}
