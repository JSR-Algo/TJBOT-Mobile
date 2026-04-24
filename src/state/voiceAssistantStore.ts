import { create } from 'zustand';

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_MIC_PERMISSION'
  | 'CONNECTING'
  | 'LISTENING'
  | 'STREAMING_INPUT'
  | 'WAITING_AI'
  | 'PLAYING_AI_AUDIO'
  | 'INTERRUPTED'
  | 'RECONNECTING'
  | 'ERROR';

export type AudioMode = 'unknown' | 'fast' | 'cautious' | 'full_buffer';

/** Valid state transitions map */
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  IDLE: ['REQUESTING_MIC_PERMISSION', 'CONNECTING'],
  REQUESTING_MIC_PERMISSION: ['CONNECTING', 'ERROR'],
  CONNECTING: ['LISTENING', 'ERROR', 'RECONNECTING'],
  // A5: goAway can arrive mid-turn from any active state — allow the
  // RECONNECTING handoff so the goAway handler doesn't have to short-circuit
  // through IDLE and lose the resumption handle.
  LISTENING: ['STREAMING_INPUT', 'PLAYING_AI_AUDIO', 'RECONNECTING', 'IDLE', 'ERROR'],
  STREAMING_INPUT: ['WAITING_AI', 'PLAYING_AI_AUDIO', 'INTERRUPTED', 'RECONNECTING', 'IDLE', 'ERROR'],
  WAITING_AI: ['STREAMING_INPUT', 'PLAYING_AI_AUDIO', 'LISTENING', 'RECONNECTING', 'IDLE', 'ERROR'],
  PLAYING_AI_AUDIO: ['INTERRUPTED', 'STREAMING_INPUT', 'LISTENING', 'RECONNECTING', 'IDLE', 'ERROR'],
  INTERRUPTED: ['STREAMING_INPUT', 'LISTENING', 'RECONNECTING', 'IDLE', 'ERROR'],
  RECONNECTING: ['CONNECTING', 'LISTENING', 'IDLE', 'ERROR'],
  ERROR: ['IDLE', 'CONNECTING'],
};

interface Message {
  role: 'user' | 'ai';
  text: string;
  ts: number;
  interrupted?: boolean;
}

interface VoiceAssistantStore {
  // State
  state: VoiceState;
  userTranscript: string;
  aiTranscript: string;
  messages: Message[];
  audioLevel: number;
  error: string | null;
  sessionStartTime: number | null;
  expressionOverride: string | null;
  audioMode: AudioMode;
  /**
   * True while the playback service is refilling after an underrun (plan §2.5).
   * UI flag only — not an FSM state. Drives subtle buffering cues without
   * widening the 10-state transition matrix.
   */
  isBuffering: boolean;
  /**
   * True when the playback layer reports a sustained underrun.
   * Drives the "mạng yếu" banner. Cleared on endTurn / interrupt /
   * stopSession. UI flag only — never an FSM state. Currently wired
   * through {@link PcmStreamPlayer#onPoorNetwork}, which is a no-op on
   * the continuous-streaming path; retained so a future real poor-network
   * detector in the native pipeline can drive it without UI refactor.
   */
  isPoorNetwork: boolean;

  // Actions
  transition: (to: VoiceState) => boolean;
  setUserTranscript: (text: string) => void;
  setAiTranscript: (text: string) => void;
  addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => void;
  setAudioLevel: (level: number) => void;
  setError: (error: string | null) => void;
  setExpressionOverride: (expr: string | null) => void;
  setAudioMode: (mode: AudioMode) => void;
  setIsBuffering: (buffering: boolean) => void;
  setIsPoorNetwork: (poor: boolean) => void;
  stopSession: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  state: 'IDLE' as VoiceState,
  userTranscript: '',
  aiTranscript: '',
  messages: [] as Message[],
  audioLevel: 0,
  error: null as string | null,
  sessionStartTime: null as number | null,
  expressionOverride: null as string | null,
  audioMode: 'unknown' as AudioMode,
  isBuffering: false,
  isPoorNetwork: false,
};

export const useVoiceAssistantStore = create<VoiceAssistantStore>((set, get) => ({
  ...INITIAL_STATE,

  transition: (to: VoiceState): boolean => {
    const current = get().state;
    const valid = VALID_TRANSITIONS[current];
    if (!valid?.includes(to)) {
      if (__DEV__) {
        console.warn(`[VoiceStateMachine] Invalid transition: ${current} -> ${to}`);
      }
      return false;
    }
    set({ state: to });

    // Auto-actions on state entry
    if (to === 'CONNECTING' && !get().sessionStartTime) {
      set({ sessionStartTime: Date.now() });
    }
    if (to === 'ERROR') {
      setTimeout(() => {
        if (get().state === 'ERROR') set({ state: 'IDLE' });
      }, 5000);
    }
    return true;
  },

  setUserTranscript: (text: string) => set({ userTranscript: text }),
  setAiTranscript: (text: string) => set({ aiTranscript: text }),

  addMessage: (role: 'user' | 'ai', text: string, interrupted?: boolean) => {
    if (!text.trim()) return;
    set((s) => ({
      messages: [...s.messages, { role, text: text.trim(), ts: Date.now(), ...(interrupted ? { interrupted } : {}) }],
      ...(role === 'user' ? { userTranscript: '' } : { aiTranscript: '' }),
    }));
  },

  setAudioLevel: (level: number) => set({ audioLevel: Math.max(0, Math.min(1, level)) }),

  setError: (error: string | null) => set({ error }),

  setExpressionOverride: (expr: string | null) => set({ expressionOverride: expr }),

  setAudioMode: (mode: AudioMode) => set({ audioMode: mode }),

  setIsBuffering: (buffering: boolean) => set({ isBuffering: buffering }),

  setIsPoorNetwork: (poor: boolean) => set({ isPoorNetwork: poor }),

  stopSession: () => set((s) => ({
    state: 'IDLE',
    userTranscript: '',
    aiTranscript: '',
    audioLevel: 0,
    error: null,
    sessionStartTime: null,
    expressionOverride: null,
    audioMode: 'unknown',
    isBuffering: false,
    isPoorNetwork: false,
    messages: s.messages,
  })),

  reset: () => set(INITIAL_STATE),
}));
