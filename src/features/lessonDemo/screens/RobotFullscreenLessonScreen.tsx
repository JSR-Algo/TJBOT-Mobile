import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGeminiConversation } from '@/hooks/useGeminiConversation';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useVoiceAssistantStore } from '@/state/voiceAssistantStore';
import { BARN_SAY_IT_LESSON_ID } from '../content/barnSayItLesson';
import { buildLessonVoicePrompt } from '../lessonVoicePrompt';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';
import { FullscreenLessonScene } from '../scene/FullscreenLessonScene';
import type { LessonAgeBand } from '../types';
import {
  ensureMicPermission,
  openAppSettings,
  probeVoiceReadiness,
  voiceReadinessMessage,
  type VoiceReadinessIssue,
} from '../voiceReadiness';
import { diagnosticLog } from '@/services/observability/diagnosticLog';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotFullscreenLessonScreen'>;

export function RobotFullscreenLessonScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const ageBand = (route.params?.ageBand ?? '4-6') as LessonAgeBand;
  const lessonId = route.params?.lessonId ?? BARN_SAY_IT_LESSON_ID;
  const autoStartVoice = route.params?.autoStartVoice ?? true;

  const lesson = useMemo(
    () => staticLessonContentProvider.getLessonById(lessonId, ageBand)
      ?? staticLessonContentProvider.getLessonById(BARN_SAY_IT_LESSON_ID, ageBand)!,
    [ageBand, lessonId],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [readinessIssue, setReadinessIssue] = useState<VoiceReadinessIssue>(null);
  const completeLesson = useLessonDemoProgressStore((state) => state.completeLesson);

  const voiceState = useVoiceAssistantStore((state) => state.state);
  const aiTranscript = useVoiceAssistantStore((state) => state.aiTranscript);
  const voiceError = useVoiceAssistantStore((state) => state.error);

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;
  const isSpeaking = voiceState === 'ASSISTANT_SPEAKING' || voiceState === 'WAITING_AI';
  const voiceActive = voiceState !== 'IDLE' && voiceState !== 'ENDED' && voiceState !== 'ERROR_FATAL';

  const systemInstruction = useMemo(
    () => buildLessonVoicePrompt(lesson, stepIndex),
    [lesson, stepIndex],
  );

  const { startConversation, stopConversation } = useGeminiConversation({ systemInstruction });

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [stepIndex]);

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

  useEffect(() => () => {
    stopConversation();
  }, [stopConversation]);

  const handleExit = useCallback(() => {
    stopConversation();
    navigation.goBack();
  }, [navigation, stopConversation]);

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }
    void completeLesson(lesson, ageBand);
    stopConversation();
    navigation.navigate(ROUTES.ParentLessonSummaryScreen, { lessonId: lesson.lessonId, ageBand });
  }, [ageBand, completeLesson, isLastStep, lesson, navigation, stopConversation]);

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
      event: 'robot_lesson_error',
      message: displayedError,
      detail: {
        lessonId: lesson.lessonId,
        stepIndex,
        voiceState,
        readinessIssue,
      },
    });
  }, [displayedError, lesson.lessonId, readinessIssue, stepIndex, voiceState]);

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      <FullscreenLessonScene
        lesson={lesson}
        step={step}
        stepIndex={stepIndex}
        totalSteps={lesson.steps.length}
        voiceActive={voiceActive}
        isSpeaking={isSpeaking}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close lesson"
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

      {step.choices ? (
        <View style={[styles.choices, { bottom: insets.bottom + 96 }]}>
          {step.choices.map((choice) => {
            const selected = selectedChoiceId === choice.id;
            return (
              <TouchableOpacity
                key={choice.id}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${choice.label}`}
                onPress={() => setSelectedChoiceId(choice.id)}
                style={[styles.choice, selected ? styles.choiceSelected : null]}
              >
                <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null]}>
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {aiTranscript ? (
        <View style={[styles.transcript, { bottom: insets.bottom + 168 }]} pointerEvents="none">
          <Text style={styles.transcriptText} numberOfLines={3}>
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          onPress={() => {
            if (stepIndex > 0) setStepIndex((current) => current - 1);
          }}
          style={[styles.footerButton, stepIndex === 0 ? styles.footerButtonDisabled : null]}
          disabled={stepIndex === 0}
        >
          <Text style={styles.footerButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? 'Finish lesson' : 'Next step'}
          onPress={handleNext}
          style={[styles.footerButton, styles.footerButtonPrimary]}
        >
          <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
            {isLastStep ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default RobotFullscreenLessonScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
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
  choices: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 10,
  },
  choice: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  choiceSelected: {
    borderColor: '#FF6B6F',
    backgroundColor: 'rgba(255,107,111,0.82)',
  },
  choiceText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
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
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
  },
  footerButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerButtonDisabled: {
    opacity: 0.35,
  },
  footerButtonPrimary: {
    backgroundColor: '#FF6B6F',
    borderColor: '#FF6B6F',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerButtonTextPrimary: {
    color: '#FFFFFF',
  },
});