import * as Haptics from 'expo-haptics';

export interface RobotFeedbackHandlers {
  onMicPress: () => Promise<void>;
  onListening: () => Promise<void>;
  onThinking: () => Promise<void>;
  onSpeaking: () => Promise<void>;
  onError: () => Promise<void>;
  onSuccess: () => Promise<void>;
}

export function useRobotFeedback(): RobotFeedbackHandlers {
  const onMicPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const onListening = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const onThinking = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
  };

  const onSpeaking = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const onError = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  };

  const onSuccess = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  return { onMicPress, onListening, onThinking, onSpeaking, onError, onSuccess };
}
