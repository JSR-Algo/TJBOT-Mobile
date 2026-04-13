import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import type { AudioPlayer, AudioRecorder } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as aiApi from '../../api/ai';
import * as learningApi from '../../api/learning';
import { RealtimeClient } from '../../api/realtime.client';
import { getAccessToken } from '../../api/tokens';
import { Config } from '../../config';
import { useInteractions } from '../../contexts/InteractionContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import type { MainStackScreenProps } from '../../navigation/types';
import { RobotFace } from '../../components/robot/RobotFace';
import { useRobotStateMachine } from './RobotStateMachine';
import { getModeTheme } from '../../components/robot/RobotModeTheme';
import { useRobotFeedback } from '../../hooks/useRobotFeedback';
import { useStreamingTranscript } from '../../hooks/use-streaming-transcript';
import { useAudioStreamer } from '../../hooks/use-audio-streamer';
import type { RobotMode } from './RobotStateMachine';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────────────
// Maps to all 12 RobotStateMachine states.
type InteractionState =
  | 'IDLE'
  | 'LISTENING'
  | 'RECORDING'
  | 'PROCESSING_STT'
  | 'PROCESSING_LLM'
  | 'PROCESSING_TTS'
  | 'RESPONDING'
  | 'NO_SPEECH'
  | 'ERROR'
  | 'DONE';
// Note: low_battery, charging, offline are device states set externally, not
// driven by InteractionState; they can be triggered via robot.transition() directly.
type AppMode = 'demo' | 'live' | 'qa';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  phonemeConfidence?: number;
  ts?: number;
  latencyMs?: number;
}

interface QAStats {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
}

// ─── Typing dots ────────────────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 280, useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: color,
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Mode pill ──────────────────────────────────────────────────────────────
const MODE_META: Record<AppMode, { label: string; icon: string }> = {
  demo:  { label: 'Demo', icon: '✨' },
  live:  { label: 'Live Talk', icon: '🎙' },
  qa:    { label: 'QA', icon: '🔬' },
};

// ─── Robot mode labels ──────────────────────────────────────────────────────
const ROBOT_MODE_LABELS: Record<RobotMode, string> = {
  learning:    '📚',
  playful:     '🎉',
  focus:       '🎯',
  parent_mode: '👪',
  sleep_mode:  '🌙',
};

const ROBOT_MODES: RobotMode[] = ['learning', 'playful', 'focus', 'parent_mode', 'sleep_mode'];

// ─── Status messages ─────────────────────────────────────────────────────────
const STATUS: Record<InteractionState, string> = {
  IDLE:            'Readyu2026',
  LISTENING:       'Listeningu2026',
  RECORDING:       'Recordingu2026',
  PROCESSING_STT:  'Transcribingu2026',
  PROCESSING_LLM:  'Thinkingu2026',
  PROCESSING_TTS:  'Preparing voiceu2026',
  RESPONDING:      'Speakingu2026',
  NO_SPEECH:       'No speech detected',
  ERROR:           'Something went wrong',
  DONE:            'Readyu2026',
};

// ─── Main component ──────────────────────────────────────────────────────────
export function InteractionScreen({ route }: MainStackScreenProps<'Interaction'>): React.JSX.Element {
  const childId = route?.params?.childId;
  const { children } = useHousehold();
  const activeChild = childId ? children.find((c) => c.id === childId) : children[0];

  // ─ Core state
  const [interactionState, setInteractionState] = useState<InteractionState>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [learningSessionId, setLearningSessionId] = useState<string | undefined>(undefined);
  const [promptsShown, setPromptsShown] = useState(0);
  const [responsesGiven, setResponsesGiven] = useState(0);
  const [correctResponses, setCorrectResponses] = useState(0);
  const [expectedVocab, setExpectedVocab] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transcript, transcriptActions] = useStreamingTranscript();
  const [isTyping, setIsTyping] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [appMode, setAppMode] = useState<AppMode>('live');
  const [qaStats, setQaStats] = useState<QAStats | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [robotMode, setRobotMode] = useState<RobotMode>('learning');
  const [processingStep, setProcessingStep] = useState('');
  const [autoListen, setAutoListen] = useState(true); // auto-restart mic after each response

  // ─ Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vadActiveRef = useRef(false);
  const isPreparingRef = useRef(false); // prevent concurrent prepareToRecordAsync
  const promptsShownRef = useRef(0);
  const responsesGivenRef = useRef(0);
  const correctResponsesRef = useRef(0);
  const learningSessionIdRef = useRef<string | undefined>(undefined);
  const sttStartRef = useRef(0);
  const llmStartRef = useRef(0);
  const ttsStartRef = useRef(0);

  // Realtime WebSocket client
  const realtimeRef = useRef<RealtimeClient | null>(null);
  const wsConnectedRef = useRef(false);
  const awaitingWsTurnRef = useRef(false);

  // Streaming STT latency tracking (QA mode)
  const streamingStartRef = useRef(0);
  const firstPartialRef = useRef(0);
  const finalTranscriptRef = useRef(0);

  useEffect(() => {
    const wsUrl = (Config.API_BASE_URL || '').replace(/\/v1$/, '').replace(/^http/, 'ws');
    let mounted = true;

    (async () => {
      const token = await getAccessToken() ?? '';
      if (!mounted) return;
      const client = new RealtimeClient({ url: wsUrl, authToken: token });
      client.setHandlers({
        onConnected: () => { wsConnectedRef.current = true; },
        onDisconnected: () => { wsConnectedRef.current = false; },
        onTranscriptPartial: (ev) => {
          transcriptActions.onPartial(ev.text);
          if (!firstPartialRef.current) firstPartialRef.current = Date.now();
          // Stay in LISTENING u2014 do NOT change state
        },
        onTranscriptFinal: (ev) => {
          transcriptActions.onFinal(ev.text);
          finalTranscriptRef.current = Date.now();
          // Stay in LISTENING u2014 more segments may follow
          // Message creation happens on mic stop (handleMicPress / VAD silence)
        },
        onNoSpeech: () => {
          transcriptActions.reset();
          setInteractionState('NO_SPEECH');
          setTimeout(() => setInteractionState('IDLE'), 1500);
        },
        onTtsChunk: () => { setInteractionState('RESPONDING'); },
        onTurnComplete: () => {
          if (awaitingWsTurnRef.current) {
            // File-upload-over-WS path: create user message now
            const fullTranscript = transcriptActions.finalize();
            if (fullTranscript) {
              setMessages((prev) => [...prev, { role: 'user', text: fullTranscript, ts: Date.now() }]);
            }
            awaitingWsTurnRef.current = false;
          }
          transcriptActions.reset();
          setInteractionState('DONE');
          setTimeout(() => setInteractionState('IDLE'), 500);
        },
        onError: (err) => {
          transcriptActions.reset();
          awaitingWsTurnRef.current = false;
          wsConnectedRef.current = false;
        },
      });
      client.connect();
      realtimeRef.current = client;
    })();

    return () => { mounted = false; realtimeRef.current?.disconnect(); };
  }, []);

  // ─ Robot & audio
  const robot = useRobotStateMachine('idle', robotMode);
  const feedback = useRobotFeedback();
  const recorderRef = useRef<AudioRecorder | null>(null);
  const currentTheme = getModeTheme(robotMode);
  // Wire useAudioStreamer with VAD for streaming path
  const audioStreamer = useAudioStreamer({
    clientRef: realtimeRef,
    onSpeechStart: () => {
      // VAD detected speech onset u2014 audio streaming begins
    },
    onSilence: () => {
      // VAD detected sustained silence u2014 AUDIO_END sent by hook
      const fullTranscript = transcriptActions.finalize();
      if (fullTranscript) {
        setMessages((prev) => [...prev, { role: 'user', text: fullTranscript, ts: Date.now() }]);
      }
      setInteractionState('PROCESSING_LLM');
    },
    onError: (err) => {
      transcriptActions.reset();
      setError(err.message);
      setInteractionState('ERROR');
    },
  });

  // Create a fresh recorder for each recording session
  const createFreshRecorder = () => {
    // Null out previous recorder so old timeout refs don't fire
    recorderRef.current = null;
    const rec = new AudioModule.AudioRecorder({
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    });
    recorderRef.current = rec;
    return rec;
  };

  // ─ VAD disabled — user taps ⏹ to send, no auto-send on silence

  // ─ Tap-to-interrupt (RM-05) ───────────────────────────────────────────────
  // The child (or parent) can tap the robot face — or long-press anywhere on
  // the speaking screen — to abort the in-flight TTS. The contract for what
  // "abort" means lives in `tbot-infra/contracts/realtime-events.{d.ts,js}`
  // (`InterruptEvent`, RM-05 + ADR-006). Two things MUST happen on the same
  // tick so we hit the ADR-011 `interrupt_to_stop_ms` p95 ≤ 200 ms budget:
  //   1. Stop local audio output immediately (no draining the AudioPlayer).
  //   2. Emit `INTERRUPT` to the backend so the orchestrator drops the
  //      AbortSignal across STT/LLM/TTS (worker-1 slice RB-01..06).
  // Order matters: local stop is synchronous and unblocks the child's ear
  // even if the WebSocket is mid-reconnect.
  const handleBargeIn = useCallback(() => {
    // Only act while the robot is actually speaking — taps in other states
    // belong to whichever child control is rendered there.
    if (interactionState !== 'RESPONDING') return;

    // 1. Hard-stop local playback. We pause + remove instead of letting the
    //    player drain so audio is silent in well under the 120 ms client
    //    budget (RM-05 acceptance criterion).
    const player = playerRef.current;
    if (player) {
      try { player.pause(); } catch {}
      try { player.remove(); } catch {}
      playerRef.current = null;
    }

    // 2. Emit INTERRUPT to the backend with `USER_TAP` reason so the server
    //    metric `tbot/session/interrupt_to_stop_ms` (worker-2, RB-07) tags
    //    this turn correctly.
    realtimeRef.current?.sendInterrupt({
      sessionId: sessionId ?? '',
      reason: 'USER_TAP',
    });

    // 3. Snap the local FSM out of RESPONDING so the auto-listen effect
    //    re-arms the mic. We do not transition through INTERRUPTED because
    //    the canonical FSM lives server-side; the mobile screen is a
    //    projection and DONE → IDLE → LISTENING is the existing path that
    //    already wires `audioStreamer.startStreaming()`.
    setProcessingStep('');
    setInteractionState('DONE');
  }, [interactionState, sessionId]);

  // ─ Sync interaction → robot state
  useEffect(() => {
    switch (interactionState) {
      case 'IDLE':
      case 'DONE':            robot.transition('idle'); break;
      case 'LISTENING':       robot.transition('listening'); void feedback.onListening(); break;
      case 'RECORDING':       robot.transition('recording'); void feedback.onListening(); break;
      case 'PROCESSING_STT':  robot.transition('processing_stt'); break;
      case 'PROCESSING_LLM':  robot.transition('processing_llm'); break;
      case 'PROCESSING_TTS':  robot.transition('processing_tts'); break;
      case 'RESPONDING':      robot.transition('speaking');  void feedback.onSpeaking();  break;
      case 'NO_SPEECH':       robot.transition('no_speech'); break;
      case 'ERROR':           robot.transition('error'); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionState]);

  // ─ Ref syncs
  useEffect(() => { promptsShownRef.current = promptsShown; }, [promptsShown]);
  useEffect(() => { responsesGivenRef.current = responsesGiven; }, [responsesGiven]);
  useEffect(() => { correctResponsesRef.current = correctResponses; }, [correctResponses]);
  useEffect(() => { learningSessionIdRef.current = learningSessionId; }, [learningSessionId]);

  // ─ Auto-scroll
  const scrollToBottom = () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  useEffect(() => { if (isTyping || transcript.hasText) scrollToBottom(); }, [isTyping, transcript.hasText]);

  // ─ Request permissions on mount (mic + speaker)
  useEffect(() => {
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          setError('Microphone permission required. Please allow in Settings.');
          return;
        }
        // Prime audio session so speaker works immediately
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Auto-listen: start on mount + restart after each response
  useEffect(() => {
    if (!autoListen) return;
    if (interactionState === 'IDLE' || interactionState === 'DONE') {
      const delay = interactionState === 'DONE' ? 900 : 600;
      const timer = setTimeout(() => { void startListening(); }, delay);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionState, autoListen]);

  // ─ Load today session
  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      try {
        const session = await learningApi.getTodaySession(activeChild.id);
        setLearningSessionId(session.id);
        setExpectedVocab(session.session_payload?.interaction?.expected_vocab ?? []);
        const warmup = session.session_payload?.warmup;
        if (warmup?.greeting) {
          setMessages([{ role: 'assistant', text: `${warmup.greeting} ${warmup.question}`, ts: Date.now() }]);
          setPromptsShown(1);
        }
      } catch {
        if (activeChild?.name) {
          const childProfile = {
            age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
            vocabulary_level: activeChild.vocabulary_level ?? 'beginner',
            interests: activeChild.interests ?? [],
            speaking_confidence: activeChild.speaking_confidence ?? 50,
          };
          try {
            const warmup = await aiApi.chat(
              `[WARMUP] Greet ${activeChild.name} warmly to start a new English learning session. Be excited, friendly, and introduce one fun topic. Keep it very short.`,
              undefined,
              childProfile,
              [],
            );
            setMessages([{ role: 'assistant', text: warmup.response, ts: Date.now() }]);
          } catch {
            setMessages([{ role: 'assistant', text: `Hi ${activeChild.name}! I'm TBOT 🤖 Ready to learn English together? 😊`, ts: Date.now() }]);
          }
        }
      }
    })();
  }, [activeChild]);

  // ─ Cleanup
  const { addInteraction, interactions, loadInteractions } = useInteractions();
  useEffect(() => {
    if (activeChild && interactions.length === 0) loadInteractions(activeChild.id);
  }, [activeChild, interactions.length, loadInteractions]);

  useEffect(() => {
    if (!activeChild) return;
    return () => {
      try { if (recorderRef.current?.isRecording) recorderRef.current.stop().catch(() => {}); } catch {}
      if (playerRef.current) { try { playerRef.current.remove(); } catch {} playerRef.current = null; }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      const sid = learningSessionIdRef.current;
      if (responsesGivenRef.current > 0 && sid) {
        learningApi.completeSession(activeChild.id, {
          session_id: sid,
          prompts_shown: promptsShownRef.current,
          responses_given: responsesGivenRef.current,
          correct_responses: correctResponsesRef.current,
        }).catch(() => {});
      }
    };
  }, [activeChild]);

  // ─── Recording ──────────────────────────────────────────────────────────
  const stopRecordingAndTranscribe = async () => {
    vadActiveRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (meteringIntervalRef.current) { clearInterval(meteringIntervalRef.current); meteringIntervalRef.current = null; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAudioLevel(0);
    setInteractionState('PROCESSING_STT');
    let audioUri: string | undefined;
    const rec = recorderRef.current;
    if (rec && rec.isRecording) {
      try {
        await rec.stop();
        await setAudioModeAsync({ allowsRecording: false });
        let attempts = 0;
        while (!rec.uri && attempts < 20) { await new Promise((r) => setTimeout(r, 100)); attempts++; }
        audioUri = rec.uri ?? undefined;
      } catch {}
    }
    return audioUri;
  };

  const startListening = async () => {
    if (interactionState !== 'IDLE' && interactionState !== 'DONE') return;
    if (isPreparingRef.current) return;
    setError(null);
    setQaStats(null);

    // REALTIME STREAMING PATH: use useAudioStreamer with VAD
    if (wsConnectedRef.current && realtimeRef.current) {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) { setError('Microphone permission required.'); return; }
        transcriptActions.reset();
        streamingStartRef.current = Date.now();
        firstPartialRef.current = 0;
        finalTranscriptRef.current = 0;
        audioStreamer.startStreaming();
        setInteractionState('LISTENING');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      } catch (err: unknown) {
        // Fall through to REST path
      }
    }

    // REST FALLBACK PATH: record to file then upload
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setError('Microphone permission required. Please allow in Settings.'); return; }
      isPreparingRef.current = true;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await new Promise((r) => setTimeout(r, 150)); // wait for audio session

      // Always create a fresh recorder — never reuse after stop()
      const rec = createFreshRecorder();

      await rec.prepareToRecordAsync();
      isPreparingRef.current = false;
      rec.record();
      vadActiveRef.current = true;
      silenceTimerRef.current = null;

      // VAD + metering: poll every 100ms
      const SILENCE_THRESHOLD = 0.30;
      const SPEECH_GRACE_MS  = 300;
      const SILENCE_TIMEOUT_MS = 500;
      let speechDetectedMs = 0;
      let nullMeteringMs = 0; // track if no metering data (simulator fallback)

      const autoSend = async () => {
        if (recorderRef.current === rec && rec.isRecording) {
          if (meteringIntervalRef.current) { clearInterval(meteringIntervalRef.current); meteringIntervalRef.current = null; }
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
          const audioUri = await stopRecordingAndTranscribe();
          await processTranscription(audioUri);
        }
      };

      meteringIntervalRef.current = setInterval(() => {
        const state = rec.getStatus();

        // Simulator fallback: no metering → auto-send after 3s
        if (state.metering == null) {
          nullMeteringMs += 100;
          if (nullMeteringMs >= 3000 && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              void autoSend();
            }, 0);
          }
          return;
        }

        nullMeteringMs = 0; // reset if real metering available
        const normalized = Math.max(0, Math.min(1, (state.metering + 80) / 80));
        setAudioLevel(normalized);

        if (normalized >= SILENCE_THRESHOLD) {
          speechDetectedMs += 100;
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (speechDetectedMs >= SPEECH_GRACE_MS && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            void autoSend();
          }, SILENCE_TIMEOUT_MS);
        }
      }, 100);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setInteractionState('RECORDING');

      // Hard 30s cap
      setTimeout(async () => {
        if (recorderRef.current === rec && rec.isRecording) {
          vadActiveRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          const audioUri = await stopRecordingAndTranscribe();
          await processTranscription(audioUri);
        }
      }, 30000);
    } catch (err: unknown) {
      isPreparingRef.current = false;
      const e = err as { message?: string };
      setError(e?.message ?? 'Could not start recording.');
      robot.transition('error');
      void feedback.onError();
    }
  };

  const handleMicPress = async () => {
    void feedback.onMicPress();
    if (interactionState === 'RECORDING' || interactionState === 'LISTENING') {
      // Manual stop - streaming or file-based
      if (audioStreamer.isStreaming) {
        audioStreamer.stopStreaming();
        const fullTranscript = transcriptActions.finalize();
        if (fullTranscript) {
          setMessages((prev) => [...prev, { role: 'user', text: fullTranscript, ts: Date.now() }]);
        }
        setInteractionState('PROCESSING_LLM');
        return;
      }
      const audioUri = await stopRecordingAndTranscribe();
      await processTranscription(audioUri);
      return;
    }
    if (micDisabled) return;
    // Toggle auto-listen or manual start
    await startListening();
  };

  // ─── Build conversation history ──────────────────────────────────────────
  const buildHistory = (msgs: Message[]) => {
    const history: Array<{ user: string; assistant: string }> = [];
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === 'user' && msgs[i + 1]?.role === 'assistant') {
        history.push({ user: msgs[i].text, assistant: msgs[i + 1].text });
        i++; // skip assistant message
      }
    }
    return history.slice(-5);
  };

  // ─── AI Pipeline ─────────────────────────────────────────────────────────
  const processTranscription = async (audioUri: string | undefined) => {
    if (!audioUri) {
      setInteractionState('IDLE');
      transcriptActions.reset();
      setError("Couldn't capture audio. Tap mic and try again.");
      robot.transition('error');
      void feedback.onError();
      return;
    }
    const totalStart = Date.now();

    // WebSocket realtime path: send audio via WS, responses stream back via event handlers
    if (wsConnectedRef.current && realtimeRef.current) {
      try {
        setInteractionState('PROCESSING_STT');
        setProcessingStep('Sending audio...');
        const response = await fetch(audioUri);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.readAsDataURL(blob);
        });
        // Send via WebSocket: AUDIO_START -> AUDIO_CHUNK -> AUDIO_END
        realtimeRef.current.sendAudioChunk(base64);
        realtimeRef.current.sendAudioEnd();
        // File-upload-over-WS: message created in onTurnComplete via awaitingWsTurnRef
        awaitingWsTurnRef.current = true;
        return;
      } catch (wsErr) {
        // Fall through to REST path on WS failure
        setError(null);
      }
    }

    try {
      // STT (REST fallback)
      sttStartRef.current = Date.now();
      setProcessingStep('Transcribing…');
      transcriptActions.onPartial('Recognizing your voice…');
      const transcription = await aiApi.transcribe(audioUri);
      const sttMs = Date.now() - sttStartRef.current;
      const rawText = transcription.text?.trim() ?? '';
      const phonemeConfidence = transcription.phoneme_confidence;

      // Handle silence / very short response — send gentle re-prompt instead of error
      const isSilent = rawText.length < 3;
      const userText = isSilent
        ? '[SILENCE] The child did not respond. Gently encourage them to try again. Keep it very short and friendly.'
        : rawText;

      transcriptActions.reset();

      // Only add to visible transcript if child actually said something
      if (!isSilent) {
        setMessages((prev) => [...prev, { role: 'user', text: rawText, phonemeConfidence, ts: Date.now() }]);
        scrollToBottom();
        setResponsesGiven((n) => n + 1);

        const isCorrect = expectedVocab.some((w) => rawText.toLowerCase().includes(w.toLowerCase()));
        if (isCorrect) setCorrectResponses((n) => n + 1);
      }

      const childProfile = activeChild ? {
        age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
        vocabulary_level: activeChild.vocabulary_level ?? 'beginner',
        interests: activeChild.interests ?? [],
        speaking_confidence: activeChild.speaking_confidence ?? 50,
        session_context: { words_to_learn: expectedVocab },
      } : undefined;

      // Build history from current messages
      const history = buildHistory(messages);

      // LLM
      llmStartRef.current = Date.now();
      setProcessingStep('Thinking…');
      setIsTyping(true);
      scrollToBottom();
      const chatResult = await aiApi.chat(userText, sessionId, childProfile, history);
      const llmMs = Date.now() - llmStartRef.current;
      setIsTyping(false);
      setSessionId(chatResult.session_id);
      const responseText = chatResult.response;
      setMessages((prev) => [...prev, { role: 'assistant', text: responseText, ts: Date.now(), latencyMs: llmMs }]);
      scrollToBottom();
      setPromptsShown((n) => n + 1);
      addInteraction(userText, responseText);

      if (activeChild && !isSilent) {
        learningApi.saveInteraction(activeChild.id, {
          session_id: learningSessionId,
          user_message: rawText,
          ai_response: responseText,
          confidence_signal: transcription.confidence_signal ?? 50,
          phoneme_confidence: phonemeConfidence,
        }).catch(() => {});
      }

      // TTS
      ttsStartRef.current = Date.now();
      setProcessingStep('Generating voice…');
      setInteractionState('RESPONDING');

      const playTts = async (retries = 1): Promise<void> => {
        try {
          const tts = await aiApi.synthesize(responseText);
          const ttsMs = Date.now() - ttsStartRef.current;
          if (appMode === 'qa') {
            setQaStats({ sttMs, llmMs, ttsMs, totalMs: Date.now() - totalStart });
          }
          if (tts.audio_url) {
            if (playerRef.current) { try { playerRef.current.remove(); } catch {} playerRef.current = null; }
            const player = createAudioPlayer(tts.audio_url);
            playerRef.current = player;
            player.play();
            player.addListener('playbackStatusUpdate', (status) => {
              if (status.didJustFinish) {
                player.remove();
                if (playerRef.current === player) playerRef.current = null;
              }
            });
          }
        } catch {
          if (retries > 0) { await new Promise((r) => setTimeout(r, 800)); return playTts(retries - 1); }
        }
      };
      await playTts();
      void feedback.onSuccess();
      setProcessingStep('');
      setInteractionState('DONE');
    } catch (err: unknown) {
      setIsTyping(false);
      transcriptActions.reset();
      setProcessingStep('');
      setInteractionState('IDLE');
      robot.transition('error');
      void feedback.onError();
      const e = err as { message?: string; code?: string };
      setError(e?.message?.includes('Network') || e?.code === 'ECONNABORTED'
        ? "Can't reach server. Check your connection."
        : e?.message ?? "Something went wrong. Tap to retry.");
    }
  };

  const micActive = interactionState === 'RECORDING' || interactionState === 'LISTENING';
  const micDisabled = interactionState === 'PROCESSING_STT' || interactionState === 'PROCESSING_LLM' || interactionState === 'PROCESSING_TTS' || interactionState === 'RESPONDING';

  // ─── Mic button pulse animation ──────────────────────────────────────────
  const micPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (micActive) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      micPulse.setValue(1);
    }
  }, [micActive, micPulse]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={currentTheme.bg} />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          {/* Child name */}
          <Text style={[styles.childName, { color: currentTheme.primary }]}>
            {activeChild?.name ?? 'TBOT'}
          </Text>

          {/* App mode pills */}
          <View style={styles.modePills}>
            {(Object.keys(MODE_META) as AppMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setAppMode(m)}
                style={[
                  styles.modePill,
                  appMode === m && { backgroundColor: currentTheme.primary + '30', borderColor: currentTheme.primary },
                ]}
              >
                <Text style={[styles.modePillText, appMode === m && { color: currentTheme.primary }]}>
                  {MODE_META[m].icon} {MODE_META[m].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Robot personality mode */}
          <View style={styles.robotModes}>
            {ROBOT_MODES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setRobotMode(m); robot.setMode(m); }}
                style={[styles.robotModeDot, robotMode === m && { backgroundColor: currentTheme.primary + '40' }]}
              >
                <Text style={styles.robotModeEmoji}>{ROBOT_MODE_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Robot face (RM-05 tap-to-interrupt target) ── */}
        {/*
          Tap or long-press during RESPONDING fires `handleBargeIn`. The
          Pressable is a no-op outside of RESPONDING so the rest of the
          screen behaves unchanged. `accessibilityLabel` exists so the
          screen-reader announces the gesture for parents.
        */}
        <Pressable
          onPress={handleBargeIn}
          onLongPress={handleBargeIn}
          delayLongPress={300}
          disabled={interactionState !== 'RESPONDING'}
          accessibilityRole="button"
          accessibilityLabel="Tap to interrupt the robot"
          accessibilityHint="Stops the robot mid-sentence and listens"
          testID="barge-in-target"
          style={styles.faceContainer}
        >
          <RobotFace
            robotState={robot.state}
            theme={currentTheme}
            size={Math.min(SCREEN_W * 0.58, 240)}
            audioLevel={audioLevel}
          />

          {/* Status label */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: interactionState === 'RECORDING' ? '#FF4444' : currentTheme.primary }]} />
            <Text style={[styles.statusText, { color: currentTheme.accent }]}>
              {processingStep || STATUS[interactionState]}
            </Text>
          </View>
        </Pressable>

        {/* ── QA stats ── */}
        {appMode === 'qa' && qaStats && (
          <View style={[styles.qaPanel, { borderColor: currentTheme.primary + '40' }]}>
            <Text style={[styles.qaTitle, { color: currentTheme.primary }]}>Pipeline Timing</Text>
            <View style={styles.qaRow}>
              {[
                { label: 'STT', ms: qaStats.sttMs },
                { label: 'LLM', ms: qaStats.llmMs },
                { label: 'TTS', ms: qaStats.ttsMs },
                { label: 'TOTAL', ms: qaStats.totalMs },
              ].map(({ label, ms }) => (
                <View key={label} style={styles.qaItem}>
                  <Text style={[styles.qaLabel, { color: currentTheme.accent + '99' }]}>{label}</Text>
                  <Text style={[styles.qaValue, { color: currentTheme.primary }]}>{ms}ms</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Streaming STT QA stats ── */}
        {appMode === 'qa' && firstPartialRef.current > 0 && (
          <View style={[styles.qaPanel, { borderColor: currentTheme.primary + '40' }]}>
            <Text style={[styles.qaTitle, { color: currentTheme.primary }]}>Streaming STT</Text>
            <View style={styles.qaRow}>
              {[
                { label: '1st Partial', value: String(firstPartialRef.current - streamingStartRef.current) + 'ms' },
                { label: 'Final', value: finalTranscriptRef.current ? String(finalTranscriptRef.current - streamingStartRef.current) + 'ms' : '-' },
                { label: 'Mode', value: 'WS' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.qaItem}>
                  <Text style={[styles.qaLabel, { color: currentTheme.accent + '99' }]}>{label}</Text>
                  <Text style={[styles.qaValue, { color: currentTheme.primary }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Error banner ── */}
        {error && (
          <TouchableOpacity
            style={[styles.errorBanner, { borderColor: '#FF4444' + '60' }]}
            onPress={() => setError(null)}
          >
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        )}

        {/* ── Transcript (collapsible) ── */}
        {(appMode !== 'demo' || showTranscript) && (
          <ScrollView
            ref={scrollViewRef}
            style={styles.transcript}
            contentContainerStyle={styles.transcriptContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? [styles.userBubble, { backgroundColor: currentTheme.primary }]
                    : [styles.aiBubble, { borderColor: currentTheme.primary + '50' }],
                ]}
              >
                <Text style={[styles.bubbleText, msg.role === 'assistant' && { color: currentTheme.accent }]}>
                  {msg.text}
                </Text>
                {msg.role === 'user' && msg.phonemeConfidence !== undefined && (
                  <Text style={styles.phoneme}>
                    {msg.phonemeConfidence >= 80 ? '🟢' : msg.phonemeConfidence >= 50 ? '🟡' : '🔴'} {msg.phonemeConfidence}%
                  </Text>
                )}
                {appMode === 'qa' && msg.latencyMs && (
                  <Text style={[styles.latencyTag, { color: currentTheme.primary + '80' }]}>{msg.latencyMs}ms</Text>
                )}
              </View>
            ))}

            {/* Live transcript — confirmed segments + current partial */}
            {transcript.hasText ? (
              <View style={[styles.bubble, styles.userBubble, { backgroundColor: currentTheme.primary + '50' }]}>
                {transcript.confirmedText ? (
                  <Text style={[styles.bubbleText, { opacity: 0.9 }]}>
                    {transcript.confirmedText}
                  </Text>
                ) : null}
                {transcript.partialText ? (
                  <Text style={[styles.bubbleText, { fontStyle: 'italic', opacity: 0.55 }]}>
                    {transcript.partialText}
                  </Text>
                ) : null}
              </View>
            ) : interactionState === 'LISTENING' ? (
              <View style={[styles.bubble, styles.aiBubble, { borderColor: currentTheme.primary + '30' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: '#FF4444' }]} />
                  <Text style={[styles.bubbleText, { color: currentTheme.accent + '60', fontSize: 12 }]}>
                    Listening…
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Typing indicator */}
            {isTyping ? (
              <View style={[styles.bubble, styles.aiBubble, { borderColor: currentTheme.primary + '40' }]}>
                <TypingDots color={currentTheme.accent} />
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* ── Transcript toggle (demo mode) ── */}
        {appMode === 'demo' && (
          <TouchableOpacity onPress={() => setShowTranscript((v) => !v)} style={styles.transcriptToggle}>
            <Text style={[styles.transcriptToggleText, { color: currentTheme.primary + '80' }]}>
              {showTranscript ? '▲ Hide transcript' : '▼ Show transcript'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Mic area ── */}
        <View style={styles.micArea}>
          {/* Mic outer ring (only when recording) */}
          {micActive && (
            <Animated.View
              style={[
                styles.micRing,
                {
                  borderColor: '#FF4444' + '60',
                  transform: [{ scale: micPulse }],
                },
              ]}
            />
          )}

          {/* Mic button — tap to force-stop when auto-listen active */}
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <TouchableOpacity
              testID="mic-button"
              onPress={handleMicPress}
              disabled={micDisabled}
              activeOpacity={0.85}
              style={[
                styles.micButton,
                {
                  backgroundColor: micActive
                    ? '#FF4444'
                    : micDisabled
                    ? currentTheme.primary + '40'
                    : currentTheme.primary,
                  shadowColor: micActive ? '#FF4444' : currentTheme.primary,
                },
              ]}
            >
              <Text style={styles.micIcon}>{micActive ? '🔊' : '🎙'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Mic label */}
          <Text style={[styles.micLabel, { color: currentTheme.primary + '80' }]}>
            {micActive ? 'Auto-send khi ngưng nói' : micDisabled ? processingStep || '…' : 'Tap 🎙 to speak'}
          </Text>

          {/* Auto-listen toggle */}
          <TouchableOpacity
            onPress={() => setAutoListen((v) => !v)}
            style={[styles.autoListenToggle, { borderColor: autoListen ? currentTheme.primary : '#FFFFFF20' }]}
          >
            <Text style={[styles.autoListenText, { color: autoListen ? currentTheme.primary : '#FFFFFF40' }]}>
              {autoListen ? '🔁 Hands-free ON' : '🔁 Hands-free OFF'}
            </Text>
          </TouchableOpacity>

          {/* Session stats */}
          {responsesGiven > 0 && (
            <Text style={[styles.sessionStats, { color: currentTheme.primary + '60' }]}>
              {responsesGiven} {responsesGiven === 1 ? 'reply' : 'replies'} · session
            </Text>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1 },
  safeArea:    { flex: 1 },

  // Top bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  childName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  modePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF50',
  },
  robotModes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  robotModeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotModeEmoji: { fontSize: 16 },

  // Robot face
  faceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    flex: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // QA panel
  qaPanel: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  qaTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  qaRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  qaItem:  { alignItems: 'center' },
  qaLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  qaValue: { fontSize: 13, fontWeight: '700' },

  // Error
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF444410',
    gap: 8,
  },
  errorIcon:    { fontSize: 14, color: '#FF4444' },
  errorText:    { flex: 1, fontSize: 13, color: '#FF8888', lineHeight: 18 },
  errorDismiss: { fontSize: 14, color: '#FF444460', fontWeight: '700' },

  // Transcript
  transcript: { flex: 1 },
  transcriptContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userBubble:  { alignSelf: 'flex-end' },
  aiBubble:    { alignSelf: 'flex-start', backgroundColor: '#FFFFFF08', borderWidth: 1 },
  bubbleText:  { fontSize: 14, lineHeight: 20, color: '#FFFFFF' },
  phoneme:     { fontSize: 10, color: '#FFFFFF80', marginTop: 3 },
  latencyTag:  { fontSize: 9, marginTop: 2, fontFamily: 'monospace' },

  transcriptToggle: { alignItems: 'center', paddingVertical: 4 },
  transcriptToggleText: { fontSize: 11, fontWeight: '500' },

  // Mic
  micArea: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
    gap: 6,
  },
  micRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    top: '50%',
    marginTop: -48,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  micIcon:      { fontSize: 30 },
  micLabel:     { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
  autoListenToggle: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  autoListenText: { fontSize: 11, fontWeight: '600' },
  sessionStats: { fontSize: 10, fontWeight: '500' },
});
