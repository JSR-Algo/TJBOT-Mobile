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
//
// Binding uses the screen's OWN `navigation` prop (not useNavigation()/
// useFocusEffect, which require a NavigationContainer context). The handler is
// attached IMMEDIATELY on mount — a native-stack push mounts the screen already
// focused, so the prior addListener('focus', attach) wiring never fired for
// that common case and left the guard inert in the shipped app (the MOB-2 bug).
// Focus/blur listeners then detach while the screen is backgrounded so a
// non-foreground voice screen never swallows the back press.
export function useLessonHardwareBack(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  voiceStateForResume: string,
): void {
  React.useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const onBackPress = (): boolean => {
      navigation.navigate(ROUTES.ExitConfirmScreen, {
        voiceStateBeforeInterruption: voiceStateForResume,
        resumeReason: 'exit_confirm',
      });
      return true;
    };

    const attach = (): void => {
      if (subscription) return;
      subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    };
    const detach = (): void => {
      subscription?.remove();
      subscription = null;
    };

    // Attach NOW (the mount is already focused), then track focus/blur.
    attach();
    const focusUnsubscribe = navigation.addListener?.('focus', attach);
    const blurUnsubscribe = navigation.addListener?.('blur', detach);

    return () => {
      detach();
      focusUnsubscribe?.();
      blurUnsubscribe?.();
    };
  }, [navigation, voiceStateForResume]);
}
