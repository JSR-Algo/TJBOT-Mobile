import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import {
  useAudioRecorder,
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as aiApi from '../../api/ai';
import * as learningApi from '../../api/learning';
import { ErrorMessage } from '../../components';
import theme from '../../theme';
import { useInteractions } from '../../contexts/InteractionContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import type { MainStackScreenProps } from '../../navigation/types';

type InteractionState = 'IDLE' | 'RECORDING' | 'THINKING' | 'RESPONDING' | 'DONE';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function InteractionScreen({ route }: MainStackScreenProps<'Interaction'>): React.JSX.Element {
  const childId = route?.params?.childId;
  const { children } = useHousehold();
  const activeChild = childId ? children.find((c) => c.id === childId) : children[0];

  const [state, setState] = useState<InteractionState>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [learningSessionId, setLearningSessionId] = useState<string | undefined>(undefined);
  const [promptsShown, setPromptsShown] = useState(0);
  const [responsesGiven, setResponsesGiven] = useState(0);
  const [correctResponses, setCorrectResponses] = useState(0);
  const [expectedVocab, setExpectedVocab] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const { addInteraction, interactions, loadInteractions } = useInteractions();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      try {
        const session = await learningApi.getTodaySession(activeChild.id);
        setLearningSessionId(session.id);
        setExpectedVocab(session.session_payload?.interaction?.expected_vocab ?? []);
        const warmup = session.session_payload?.warmup;
        if (warmup?.greeting) {
          setMessages([{ role: 'assistant', text: `${warmup.greeting} ${warmup.question}` }]);
          setPromptsShown(1);
        }
      } catch {
        if (activeChild.name) {
          setMessages([{ role: 'assistant', text: `Hi ${activeChild.name}! Ready to practice English today?` }]);
        }
      }
    })();
  }, [activeChild]);

  useEffect(() => {
    if (activeChild && interactions.length === 0) {
      loadInteractions(activeChild.id);
    }
  }, [activeChild, interactions.length, loadInteractions]);

  const promptsShownRef = useRef(0);
  const responsesGivenRef = useRef(0);
  const correctResponsesRef = useRef(0);
  const learningSessionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => { promptsShownRef.current = promptsShown; }, [promptsShown]);
  useEffect(() => { responsesGivenRef.current = responsesGiven; }, [responsesGiven]);
  useEffect(() => { correctResponsesRef.current = correctResponses; }, [correctResponses]);
  useEffect(() => { learningSessionIdRef.current = learningSessionId; }, [learningSessionId]);

  useEffect(() => {
    if (!activeChild) return;
    return () => {
      // Stop any in-progress recording — guard against native object already released
      try {
        if (recorder.isRecording) {
          recorder.stop().catch(() => {});
        }
      } catch { /* native shared object already released */ }
      // Release any playing audio
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch { /* already released */ }
        playerRef.current = null;
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});

      const shown = promptsShownRef.current;
      const given = responsesGivenRef.current;
      const sid = learningSessionIdRef.current;
      if (given > 0 && sid) {
        learningApi.completeSession(activeChild.id, {
          session_id: sid,
          prompts_shown: shown,
          responses_given: given,
          correct_responses: correctResponsesRef.current,
        }).catch(() => {});
      }
    };
  }, [activeChild]);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const stopRecordingAndTranscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopPulse();
    setState('THINKING');

    let audioUri: string | undefined;
    if (recorder.isRecording) {
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        // iOS writes the file asynchronously; poll until uri is populated (max 2s)
        let attempts = 0;
        while (!recorder.uri && attempts < 20) {
          await new Promise((res) => setTimeout(res, 100));
          attempts++;
        }
        audioUri = recorder.uri ?? undefined;
      } catch {
        // recording stop failed — fall through
      }
    }
    return audioUri;
  };

  const handleMicPress = async () => {
    if (state === 'RECORDING') {
      const audioUri = await stopRecordingAndTranscribe();
      await processTranscription(audioUri);
      return;
    }

    if (state !== 'IDLE' && state !== 'DONE') return;

    setError(null);

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required. Please allow access in Settings.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      // Recording started successfully — now update UI
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setState('RECORDING');
      startPulse();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Could not start recording. Please try again.');
    }
  };

  const processTranscription = async (audioUri: string | undefined) => {
    if (!audioUri) {
      setState('IDLE');
      setError("Couldn't capture audio. Please try again.");
      return;
    }
    try {
      const transcription = await aiApi.transcribe(audioUri);
      const userText = transcription.text || 'Hello TBOT!';

      setMessages((prev) => [...prev, { role: 'user', text: userText }]);
      setResponsesGiven((n) => n + 1);

      const isCorrect = expectedVocab.some(word => userText.toLowerCase().includes(word.toLowerCase()));
      if (isCorrect) setCorrectResponses((n) => n + 1);

      const childProfile = activeChild
        ? {
            age: activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : 6,
            vocabulary_level: activeChild.vocabulary_level ?? 'beginner',
            interests: activeChild.interests ?? [],
            speaking_confidence: activeChild.speaking_confidence ?? 50,
          }
        : undefined;

      const chatResult = await aiApi.chat(userText, sessionId, childProfile);
      setSessionId(chatResult.session_id);
      const responseText = chatResult.response;

      setMessages((prev) => [...prev, { role: 'assistant', text: responseText }]);
      setPromptsShown((n) => n + 1);

      addInteraction(userText, responseText);

      if (activeChild) {
        const confidenceSignal = transcription.confidence_signal ?? 50;
        learningApi.saveInteraction(activeChild.id, {
          session_id: learningSessionId,
          user_message: userText,
          ai_response: responseText,
          confidence_signal: confidenceSignal,
        }).catch(() => {});
      }

      setState('RESPONDING');
      // Play TTS audio response — retry once on failure
      const playTts = async (retries = 1): Promise<void> => {
        try {
          const tts = await aiApi.synthesize(responseText);
          if (tts.audio_url) {
            if (playerRef.current) {
              try { playerRef.current.remove(); } catch { /* already released */ }
              playerRef.current = null;
            }
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
          if (retries > 0) {
            await new Promise((res) => setTimeout(res, 800));
            return playTts(retries - 1);
          }
          // TTS playback failure is non-blocking — child still sees text response
        }
      };
      await playTts();
      setState('DONE');
    } catch (err: unknown) {
      stopPulse();
      setState('IDLE');
      const e = err as { message?: string; code?: string };
      if (e?.message?.includes('Network') || e?.code === 'ECONNABORTED') {
        setError("Oops! Couldn't reach the server. Try again?");
      } else {
        setError(e?.message ?? "Oops! Couldn't reach the server. Try again?");
      }
    }
  };

  const statusLabel: Record<InteractionState, string> = {
    IDLE: 'Tap to speak',
    RECORDING: 'Listening...',
    THINKING: 'Thinking...',
    RESPONDING: 'TBOT says',
    DONE: 'Tap to speak again',
  };

  return (
    <View style={styles.container}>
      {activeChild && (
        <View style={styles.childBadge}>
          <Text style={styles.childBadgeText}>
            {activeChild.name} · {activeChild.vocabulary_level ?? 'beginner'}
          </Text>
        </View>
      )}

      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={[styles.bubbleText, msg.role === 'assistant' && styles.assistantText]}>
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorWrapper}>
          <ErrorMessage message={error} />
        </View>
      )}

      <Text style={styles.statusLabel}>{statusLabel[state]}</Text>

      <View style={styles.micContainer}>
        <Animated.View style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]} />
        <TouchableOpacity
          style={[styles.micButton, state === 'RECORDING' && styles.micButtonActive]}
          onPress={handleMicPress}
          disabled={state === 'THINKING'}
          activeOpacity={0.8}
        >
          <Text style={styles.micEmoji}>
            {state === 'RECORDING' ? '🔴' : '🎙️'}
          </Text>
        </TouchableOpacity>
      </View>

      {promptsShown > 0 && (
        <Text style={styles.sessionStats}>
          {responsesGiven}/{promptsShown} responses
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  childBadge: {
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.radius.full,
  },
  childBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleText: {
    ...theme.typography.body1,
    color: '#FFFFFF',
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  errorWrapper: {
    paddingHorizontal: theme.spacing.md,
  },
  statusLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: theme.spacing.xl,
    height: 160,
  },
  micRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '25',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  micButtonActive: {
    backgroundColor: theme.colors.error,
  },
  micEmoji: {
    fontSize: 32,
  },
  sessionStats: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingBottom: theme.spacing.sm,
  },
});
