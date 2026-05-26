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
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  const onListening = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  const onThinking = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  const onSpeaking = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  const onError = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  const onSuccess = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics can be unavailable on simulators or unsupported devices.
    }
  };

  return { onMicPress, onListening, onThinking, onSpeaking, onError, onSuccess };
}
