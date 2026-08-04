import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { referenceImages } from '@/design-system/referenceTheme';
import { Text } from '@/design-system/primitives';
import { useGeminiConversation } from '@/hooks/useGeminiConversation';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useVoiceAssistantStore } from '@/state/voiceAssistantStore';
import { BARN_SAY_IT_LESSON_ID } from '../content/barnSayItLesson';
import { buildCompanionVoicePrompt } from '../companionVoicePrompt';
import { staticLessonContentProvider } from '../index';
import type { LessonAgeBand } from '../types';
import {
  openAppSettings,
  probeVoiceReadiness,
  voiceReadinessMessage,
  type VoiceReadinessIssue,
} from '../voiceReadiness';
import { diagnosticLog } from '@/services/observability/diagnosticLog';
import { gardenColors, gardenRadii } from '@/design-system/tokens';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotCompanionScreen'>;

const CTA_REVEAL_MS = 4500;

export function RobotCompanionScreen({ navigation, route }: Props): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const ageBand = (route.params?.ageBand ?? '4-6') as LessonAgeBand;
  const lessonId = route.params?.lessonId ?? BARN_SAY_IT_LESSON_ID;
  const autoStartVoice = route.params?.autoStartVoice ?? true;

  const lesson = useMemo(
    () => staticLessonContentProvider.getLessonById(lessonId, ageBand)
      ?? staticLessonContentProvider.getLessonById(BARN_SAY_IT_LESSON_ID, ageBand)!,
    [ageBand, language, lessonId],
  );

  const [voiceStarted, setVoiceStarted] = useState(false);
  const [readinessIssue, setReadinessIssue] = useState<VoiceReadinessIssue>(null);
  const [showStartCta, setShowStartCta] = useState(false);
  const breathe = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  const voiceState = useVoiceAssistantStore((state) => state.state);
  const voiceError = useVoiceAssistantStore((state) => state.error);

  const voiceActive = voiceState !== 'IDLE' && voiceState !== 'ENDED' && voiceState !== 'ERROR_FATAL';

  const systemInstruction = useMemo(() => buildCompanionVoicePrompt(lesson), [lesson]);
  const { startConversation, stopConversation } = useGeminiConversation({ systemInstruction });

  const lessonTitle = lesson.title ?? lesson.theme;

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
      if (issue === 'auth_missing') {
        setReadinessIssue(issue);
        return;
      }
      // Speak-first (2026-07-06): start immediately — TeeBot greets through
      // the speaker while the voice hook requests mic permission in parallel.
      // A blocked mic shows the Settings banner but never silences the robot.
      setReadinessIssue(issue);
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
      if (issue === 'auth_missing') {
        setReadinessIssue(issue);
        return;
      }
      // Speak-first: never gate the robot's voice on the mic (see auto-start).
      setReadinessIssue(issue);
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

  return (
    <View testID="robot-companion-screen" style={styles.root}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Just chatting</Text>
              <Text style={styles.headerSubtitle}>Up next: {lessonTitle}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Close chat with Robot')}
              onPress={handleExit}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main content area */}
        <View style={styles.contentArea}>
          {/* Speech bubble */}
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Say it with me: <Text style={styles.bubbleWord}>"barn"</Text> 🏠</Text>
          </View>

          {/* Robot body */}
          <Image
            source={referenceImages.robotBody}
            style={styles.robot}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />

          {/* Tap to speak button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(voiceActive ? 'Stop talking to Robot' : 'Tap to speak')}
            onPress={handleVoiceToggle}
            style={styles.speakBtn}
          >
            {voiceState === 'CONNECTING' || voiceState === 'PREPARING_AUDIO' ? (
              <ActivityIndicator color={gardenColors.ink} />
            ) : (
              <Text style={styles.speakBtnText}>🎤 Tap to speak</Text>
            )}
          </TouchableOpacity>

          {/* Start lesson button */}
          {showStartCta ? (
            <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={translateTemplate(
                  'Start lesson {{lesson}}',
                  { lesson: lessonTitle },
                  { locale: language },
                )}
                onPress={handleStartLesson}
                style={styles.startLessonBtn}
              >
                <Text style={styles.startLessonBtnText}>Start lesson</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : null}
        </View>

        {/* Error banner */}
        {displayedError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{displayedError}</Text>
            {readinessIssue === 'mic_blocked' || readinessIssue === 'mic_denied' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('Open microphone settings')}
                onPress={openAppSettings}
                style={styles.errorAction}
              >
                <Text style={styles.errorActionText}>Open Settings</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('Open diagnostic log')}
              onPress={() => navigation.navigate(ROUTES.ParentDiagnosticLogScreen)}
              style={styles.errorAction}
            >
              <Text style={styles.errorActionText}>Open diagnostic log</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export default RobotCompanionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: gardenColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
    paddingTop: 0,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: gardenColors.inkSoft,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: gardenColors.ink,
    lineHeight: 28,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gardenColors.bg2,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: gardenColors.ink,
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 32,
  },
  bubble: {
    backgroundColor: gardenColors.cream,
    borderRadius: gardenRadii.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: '85%',
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    color: gardenColors.ink,
    lineHeight: 22,
    textAlign: 'center',
  },
  bubbleWord: {
    fontWeight: '800',
    color: gardenColors.sky,
  },
  robot: {
    width: 220,
    height: 260,
  },
  speakBtn: {
    backgroundColor: gardenColors.coral,
    borderRadius: gardenRadii.chip,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  speakBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startLessonBtn: {
    backgroundColor: gardenColors.sky,
    borderRadius: gardenRadii.chip,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  startLessonBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: '#DA5B5F',
    borderRadius: gardenRadii.card,
    padding: 12,
    marginBottom: 16,
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
    borderRadius: gardenRadii.cta,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  errorActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
