import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PulseRing from '@/design-system/components/PulseRing';
import { referenceImages } from '@/design-system/referenceTheme';
import { useGeminiConversation } from '@/hooks/useGeminiConversation';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useVoiceAssistantStore } from '@/state/voiceAssistantStore';
import { BARN_SAY_IT_LESSON_ID } from '../content/barnSayItLesson';
import { buildCompanionVoicePrompt } from '../companionVoicePrompt';
import { staticLessonContentProvider } from '../index';
import type { LessonAgeBand } from '../types';
import {
  ensureMicPermission,
  openAppSettings,
  probeVoiceReadiness,
  voiceReadinessMessage,
  type VoiceReadinessIssue,
} from '../voiceReadiness';
import { diagnosticLog } from '@/services/observability/diagnosticLog';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotCompanionScreen'>;

const CTA_REVEAL_MS = 4500;

export function RobotCompanionScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ageBand = (route.params?.ageBand ?? '4-6') as LessonAgeBand;
  const lessonId = route.params?.lessonId ?? BARN_SAY_IT_LESSON_ID;
  const autoStartVoice = route.params?.autoStartVoice ?? true;

  const lesson = useMemo(
    () => staticLessonContentProvider.getLessonById(lessonId, ageBand)
      ?? staticLessonContentProvider.getLessonById(BARN_SAY_IT_LESSON_ID, ageBand)!,
    [ageBand, lessonId],
  );

  const [voiceStarted, setVoiceStarted] = useState(false);
  const [readinessIssue, setReadinessIssue] = useState<VoiceReadinessIssue>(null);
  const [showStartCta, setShowStartCta] = useState(false);
  const breathe = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  const voiceState = useVoiceAssistantStore((state) => state.state);
  const aiTranscript = useVoiceAssistantStore((state) => state.aiTranscript);
  const voiceError = useVoiceAssistantStore((state) => state.error);

  const isSpeaking = voiceState === 'ASSISTANT_SPEAKING' || voiceState === 'WAITING_AI';
  const voiceActive = voiceState !== 'IDLE' && voiceState !== 'ENDED' && voiceState !== 'ERROR_FATAL';

  const systemInstruction = useMemo(() => buildCompanionVoicePrompt(lesson), [lesson]);
  const { startConversation, stopConversation } = useGeminiConversation({ systemInstruction });

  const robotSize = Math.min(width * 0.72, height * 0.42, 360);
  const lessonTitle = lesson.title ?? lesson.theme;
  const poster = lesson.media?.posterSource ?? referenceImages.robotHead;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breathe]);

  useEffect(() => {
    if (!showStartCta) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [ctaPulse, showStartCta]);

  useEffect(() => {
    if (!autoStartVoice || voiceStarted) return;
    let cancelled = false;
    (async () => {
      const issue = await probeVoiceReadiness();
      if (cancelled) return;
      if (issue === 'mic_blocked' || issue === 'auth_missing') {
        setReadinessIssue(issue);
        return;
      }
      const granted = await ensureMicPermission();
      if (cancelled) return;
      if (!granted) {
        setReadinessIssue('mic_blocked');
        return;
      }
      setReadinessIssue(null);
      setVoiceStarted(true);
      void startConversation();
    })();
    return () => {
      cancelled = true;
    };
  }, [autoStartVoice, startConversation, voiceStarted]);

  useEffect(() => {
    const timer = setTimeout(() => setShowStartCta(true), CTA_REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    stopConversation();
  }, [stopConversation]);

  const handleExit = useCallback(() => {
    stopConversation();
    navigation.goBack();
  }, [navigation, stopConversation]);

  const handleStartLesson = useCallback(() => {
    stopConversation();
    navigation.replace(ROUTES.RobotFullscreenLessonScreen, {
      lessonId: lesson.lessonId,
      ageBand,
      autoStartVoice: true,
    });
  }, [ageBand, lesson.lessonId, navigation, stopConversation]);

  const handleVoiceToggle = useCallback(() => {
    if (voiceActive) {
      stopConversation();
      setVoiceStarted(false);
      return;
    }
    void (async () => {
      const issue = await probeVoiceReadiness();
      if (issue === 'mic_blocked' || issue === 'auth_missing') {
        setReadinessIssue(issue);
        return;
      }
      const granted = await ensureMicPermission();
      if (!granted) {
        setReadinessIssue('mic_blocked');
        return;
      }
      setReadinessIssue(null);
      setVoiceStarted(true);
      void startConversation();
    })();
  }, [startConversation, stopConversation, voiceActive]);

  const readinessMessage = voiceReadinessMessage(readinessIssue);
  const displayedError = readinessMessage ?? voiceError;

  useEffect(() => {
    if (!displayedError) return;
    diagnosticLog({
      severity: 'error',
      category: 'lesson',
      event: 'robot_companion_error',
      message: displayedError,
      detail: {
        lessonId: lesson.lessonId,
        voiceState,
        readinessIssue,
      },
    });
  }, [displayedError, lesson.lessonId, readinessIssue, voiceState]);

  const robotScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isSpeaking ? 1.05 : 1.025],
  });

  return (
    <View testID="robot-companion-screen" style={styles.root}>
      <StatusBar hidden />

      <ImageBackground source={poster} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />
      </ImageBackground>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close chat with Robot"
          onPress={handleExit}
          style={styles.iconButton}
        >
          <Text style={styles.iconButtonText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={voiceActive ? 'Stop talking to Robot' : 'Talk to Robot'}
          onPress={handleVoiceToggle}
          style={[styles.iconButton, voiceActive ? styles.iconButtonActive : null]}
        >
          {voiceState === 'CONNECTING' || voiceState === 'PREPARING_AUDIO' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.iconButtonText}>{voiceActive ? '🎙️' : '🤖'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 64 }]} pointerEvents="none">
        <Text style={styles.eyebrow}>Just chatting</Text>
        <Text style={styles.upNext}>Up next: {lessonTitle}</Text>
        <Text style={styles.hint}>Talk with Robot like a friend. Tap Start lesson when you are ready.</Text>
      </View>

      <View style={[styles.robotStage, { bottom: height * 0.22 }]}>
        {voiceActive ? (
          <View style={[styles.pulseWrap, { width: robotSize + 40, height: robotSize + 40 }]}>
            <PulseRing size={robotSize + 40} color={isSpeaking ? '#FF6B6F' : '#4CC9F0'} />
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ scale: robotScale }] }}>
          <Image
            source={referenceImages.robotHead}
            style={{ width: robotSize, height: robotSize, borderRadius: robotSize / 2 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>

      {aiTranscript ? (
        <View style={[styles.transcript, { bottom: insets.bottom + 120 }]} pointerEvents="none">
          <Text style={styles.transcriptText} numberOfLines={4}>
            {aiTranscript}
          </Text>
        </View>
      ) : null}

      {displayedError ? (
        <View style={[styles.errorBanner, { top: insets.top + 64 }]}>
          <Text style={styles.errorText}>{displayedError}</Text>
          {readinessIssue === 'mic_blocked' || readinessIssue === 'mic_denied' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open microphone settings"
              onPress={openAppSettings}
              style={styles.errorAction}
            >
              <Text style={styles.errorActionText}>Open Settings</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open diagnostic log"
            onPress={() => navigation.navigate(ROUTES.ParentDiagnosticLogScreen)}
            style={styles.errorAction}
          >
            <Text style={styles.errorActionText}>Open diagnostic log</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={[styles.ctaWrap, showStartCta ? { transform: [{ scale: ctaPulse }] } : styles.ctaHidden]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Start lesson ${lessonTitle}`}
            onPress={handleStartLesson}
            style={styles.startButton}
            disabled={!showStartCta}
          >
            <Text style={styles.startButtonText}>Start lesson</Text>
          </TouchableOpacity>
        </Animated.View>
        {!showStartCta ? (
          <Text style={styles.waitHint}>Robot is saying hi…</Text>
        ) : null}
      </View>
    </View>
  );
}

export default RobotCompanionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A2430',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 26, 36, 0.58)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,107,111,0.72)',
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  header: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 6,
    zIndex: 1,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  upNext: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  hint: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 4,
  },
  robotStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcript: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  transcriptText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(120, 24, 24, 0.82)',
    borderRadius: 12,
    padding: 10,
    zIndex: 2,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorAction: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  errorActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  ctaWrap: {
    width: '100%',
  },
  ctaHidden: {
    opacity: 0.35,
  },
  startButton: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FF6B6F',
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  waitHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
});