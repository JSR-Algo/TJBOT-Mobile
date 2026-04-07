import {
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { RobotMode } from '../../screens/interaction/RobotStateMachine';

export interface ModeTheme {
  primary: string;
  bg: string;
  accent: string;
}

const MODE_THEMES: Record<RobotMode, ModeTheme> = {
  learning: { primary: '#4A9EFF', bg: '#0A1628', accent: '#7EC8E3' },
  playful: { primary: '#FF6B6B', bg: '#1A0A1A', accent: '#FFE66D' },
  focus: { primary: '#A0A0A0', bg: '#0D0D0D', accent: '#E0E0E0' },
  parent_mode: { primary: '#50C878', bg: '#0A1A0F', accent: '#98FF98' },
  sleep_mode: { primary: '#6A5ACD', bg: '#050510', accent: '#9370DB' },
};

export function getModeTheme(mode: RobotMode): ModeTheme {
  return MODE_THEMES[mode];
}

const MODE_ORDER: RobotMode[] = [
  'learning',
  'playful',
  'focus',
  'parent_mode',
  'sleep_mode',
];

export interface RobotModeSelectorReturn {
  currentMode: RobotMode;
  currentTheme: ModeTheme;
  modeIndex: number;
  panResponder: PanResponderInstance;
  selectMode: (mode: RobotMode) => void;
  nextMode: () => void;
  prevMode: () => void;
}

const SWIPE_THRESHOLD = 50;

export function useRobotModeSelector(
  initialMode: RobotMode = 'learning',
  onModeChange?: (mode: RobotMode) => void,
): RobotModeSelectorReturn {
  const [modeIndex, setModeIndex] = useState<number>(
    MODE_ORDER.indexOf(initialMode),
  );

  const currentMode = MODE_ORDER[modeIndex];
  const currentTheme = getModeTheme(currentMode);

  const changeToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(MODE_ORDER.length - 1, index));
      setModeIndex(clamped);
      onModeChange?.(MODE_ORDER[clamped]);
    },
    [onModeChange],
  );

  const nextMode = useCallback(() => {
    setModeIndex(prev => {
      const next = (prev + 1) % MODE_ORDER.length;
      onModeChange?.(MODE_ORDER[next]);
      return next;
    });
  }, [onModeChange]);

  const prevMode = useCallback(() => {
    setModeIndex(prev => {
      const next = (prev - 1 + MODE_ORDER.length) % MODE_ORDER.length;
      onModeChange?.(MODE_ORDER[next]);
      return next;
    });
  }, [onModeChange]);

  const selectMode = useCallback(
    (mode: RobotMode) => {
      const index = MODE_ORDER.indexOf(mode);
      if (index !== -1) {
        changeToIndex(index);
      }
    },
    [changeToIndex],
  );

  const swipeStartX = useRef<number>(0);

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => Math.abs(gestureState.dx) > 10,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        swipeStartX.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left → next mode
          setModeIndex(prev => {
            const next = (prev + 1) % MODE_ORDER.length;
            onModeChange?.(MODE_ORDER[next]);
            return next;
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right → previous mode
          setModeIndex(prev => {
            const next = (prev - 1 + MODE_ORDER.length) % MODE_ORDER.length;
            onModeChange?.(MODE_ORDER[next]);
            return next;
          });
        }
      },
    }),
  ).current;

  return {
    currentMode,
    currentTheme,
    modeIndex,
    panResponder,
    selectMode,
    nextMode,
    prevMode,
  };
}

export { MODE_ORDER };
