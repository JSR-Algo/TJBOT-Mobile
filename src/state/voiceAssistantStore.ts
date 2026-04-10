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

/** Valid state transitions map */
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  IDLE: ['REQUESTING_MIC_PERMISSION', 'CONNECTING'],
  REQUESTING_MIC_PERMISSION: ['CONNECTING', 'ERROR'],
  CONNECTING: ['LISTENING', 'ERROR', 'RECONNECTING'],
  LISTENING: ['STREAMING_INPUT', 'PLAYING_AI_AUDIO', 'IDLE', 'ERROR'],
  STREAMING_INPUT: ['WAITING_AI', 'PLAYING_AI_AUDIO', 'INTERRUPTED', 'IDLE', 'ERROR'],
  WAITING_AI: ['STREAMING_INPUT', 'PLAYING_AI_AUDIO', 'LISTENING', 'IDLE', 'ERROR'],
  PLAYING_AI_AUDIO: ['INTERRUPTED', 'STREAMING_INPUT', 'LISTENING', 'IDLE', 'ERROR'],
  INTERRUPTED: ['STREAMING_INPUT', 'LISTENING', 'IDLE', 'ERROR'],
  RECONNECTING: ['CONNECTING', 'IDLE', 'ERROR'],
  ERROR: ['IDLE', 'CONNECTING'],
};

interface Message {
  role: 'user' | 'ai';
  text: string;
  ts: number;
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

  // Actions
  transition: (to: VoiceState) => boolean;
  setUserTranscript: (text: string) => void;
  setAiTranscript: (text: string) => void;
  addMessage: (role: 'user' | 'ai', text: string) => void;
  setAudioLevel: (level: number) => void;
  setError: (error: string | null) => void;
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
      // Auto-reset after 5 seconds
      setTimeout(() => {
        if (get().state === 'ERROR') set({ state: 'IDLE' });
      }, 5000);
    }
    return true;
  },

  setUserTranscript: (text: string) => set({ userTranscript: text }),
  setAiTranscript: (text: string) => set({ aiTranscript: text }),

  addMessage: (role: 'user' | 'ai', text: string) => {
    if (!text.trim()) return;
    set((s) => ({
      messages: [...s.messages, { role, text: text.trim(), ts: Date.now() }],
      // Clear live transcript for this role
      ...(role === 'user' ? { userTranscript: '' } : { aiTranscript: '' }),
    }));
  },

  setAudioLevel: (level: number) => set({ audioLevel: Math.max(0, Math.min(1, level)) }),

  setError: (error: string | null) => set({ error }),

  stopSession: () => set((s) => ({
    state: 'IDLE',
    userTranscript: '',
    aiTranscript: '',
    audioLevel: 0,
    error: null,
    sessionStartTime: null,
    messages: s.messages,
  })),

  reset: () => set(INITIAL_STATE),
}));
