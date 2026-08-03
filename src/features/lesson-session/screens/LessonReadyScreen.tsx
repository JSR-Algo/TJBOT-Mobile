import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Icon, type IconName } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { useAppLanguage } from '@/services/i18n/i18n';
import {
  bootstrapNestPhoneLesson,
  nestLessonTitle,
  type NestPhoneLessonContext,
} from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>;

function renderLoadingState(): React.ReactElement {
  return (
    <Box style={styles.stateCard} alignItems="center" gap={12}>
      <ActivityIndicator size="large" color={referenceColors.primary} />
      <Text fontWeight="700" style={styles.stateTitle}>{"Loading today's lesson"}</Text>
      <Text style={styles.stateDetail}>{"We're finding the next calm practice for your child."}</Text>
    </Box>
  );
}

function getErrorIconName(childId: string | null): IconName {
  return childId ? 'WifiOff' : 'UserRoundPlus';
}

function getErrorIconColor(childId: string | null): string {
  return childId ? referenceColors.gold : referenceColors.lavender;
}

function getErrorTitle(childId: string | null): string {
  return childId ? 'Lesson needs a connection' : 'Add a child first';
}

function getErrorActionIcon(childId: string | null): IconName {
  return childId ? 'RefreshCw' : 'UserRoundPlus';
}

function getErrorActionText(childId: string | null): string {
  return childId ? 'Try again' : 'Add child profile';
}

interface ErrorStateProps {
  childId: string | null;
  error: string;
  onRetry: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}

function renderErrorState({
  childId,
  error,
  onRetry,
  onAddChild,
  t,
}: ErrorStateProps): React.ReactElement {
  const handlePress = childId ? onRetry : onAddChild;
  const accessibilityLabel = t(childId ? 'Retry lesson loading' : 'Add a child profile');
  const iconName = getErrorActionIcon(childId);
  const actionText = getErrorActionText(childId);

  return (
    <Box accessibilityRole="alert" style={styles.stateCard} alignItems="center" gap={12}>
      <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
        <Icon
          name={getErrorIconName(childId)}
          size={30}
          color={getErrorIconColor(childId)}
          strokeWidth={2.3}
        />
      </Box>
      <Text fontWeight="800" style={styles.stateTitle}>
        {getErrorTitle(childId)}
      </Text>
      <Text style={styles.stateDetail}>{error}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={handlePress}
        style={styles.stateAction}
      >
        <Icon
          name={iconName}
          size={17}
          color={referenceColors.primaryDeep}
          strokeWidth={2.5}
        />
        <Text fontWeight="800" style={styles.stateActionText}>
          {actionText}
        </Text>
      </TouchableOpacity>
    </Box>
  );
}

function extractLessonWords(lesson: NestPhoneLessonContext | null): string[] {
  return lesson?.session.session_payload?.core_learning?.map((item) => item.word) ?? [];
}

interface SuccessStateProps {
  title: string;
  words: string[];
}

function renderSuccessState({ title, words }: SuccessStateProps): React.ReactElement {
  return (
    <>
      <Text fontWeight="800" style={styles.lessonTitle}>{title}</Text>
      <Robot emotion="happy" size={200} />
      {words.length > 0 ? (
        <Box style={styles.wordRow} flexDirection="row" gap={8}>
          {words.slice(0, 4).map((word) => (
            <Box key={word} style={styles.wordPill}>
              <Text fontWeight="700" style={styles.wordPillText}>{word}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
      <Box style={styles.headphonesPill} flexDirection="row" alignItems="center" gap={8}>
        <Icon name="Headphones" size={18} color={referenceColors.inkSoft} strokeWidth={2.4} />
        <Text fontWeight="700" style={styles.headphonesText}>Phone lesson · no robot required</Text>
      </Box>
    </>
  );
}

async function validateAndPrepareLesson(
  lesson: NestPhoneLessonContext | null,
  childId: string | null,
): Promise<NestPhoneLessonContext | null> {
  const context = lesson ?? (childId ? await bootstrapNestPhoneLesson(childId) : null);
  return context;
}

function extractLessonNavParams(context: NestPhoneLessonContext): {
  activityIndex: number;
  activityTotal: number;
  lessonTitle: string;
} {
  const lessonWords = context.session.session_payload?.core_learning
    ?.map((item) => item.word)
    .filter(Boolean) ?? [];
  return {
    activityIndex: 1,
    activityTotal: Math.max(lessonWords.length, 1),
    lessonTitle: nestLessonTitle(context.session),
  };
}

interface ContentRendererProps {
  loading: boolean;
  error: string | null;
  childId: string | null;
  title: string;
  words: string[];
  onRetry: () => void;
  onAddChild: () => void;
  t: (key: string) => string;
}

function renderMainContent({
  loading,
  error,
  childId,
  title,
  words,
  onRetry,
  onAddChild,
  t,
}: ContentRendererProps): React.ReactElement {
  if (loading) {
    return renderLoadingState();
  }
  if (error) {
    return renderErrorState({
      childId,
      error,
      onRetry,
      onAddChild,
      t,
    });
  }
  return renderSuccessState({ title, words });
}

interface FooterProps {
  shouldShow: boolean;
  onPress: () => Promise<void>;
  disabled: boolean;
  isStarting: boolean;
}

function renderFooter({ shouldShow, onPress, disabled, isStarting }: FooterProps): React.ReactElement | null {
  if (!shouldShow) return null;
  return (
    <Box style={styles.footer}>
      <PrimaryCTA
        testID="lessonReadyCta"
        onPress={onPress}
        disabled={disabled}
        color={referenceColors.primary}
      >
        {isStarting ? 'Starting…' : "I'm ready!"}
      </PrimaryCTA>
    </Box>
  );
}

async function performLessonLoad(
  childId: string | null,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setLesson: (lesson: NestPhoneLessonContext | null) => void,
): Promise<void> {
  if (!childId) {
    setLoading(false);
    setError('Add a child profile before starting a Nest lesson.');
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const context = await bootstrapNestPhoneLesson(childId);
    setLesson(context);
  } catch {
    setError('Could not load today\'s Nest lesson. Check the connection and try again.');
  } finally {
    setLoading(false);
  }
}

interface LessonState {
  lesson: NestPhoneLessonContext | null;
  loading: boolean;
  starting: boolean;
  error: string | null;
  loadLesson: () => Promise<void>;
  handleReady: () => Promise<void>;
}

function useLessonState(
  childId: string | null,
  navigation: NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>['navigation'],
): LessonState {
  const [lesson, setLesson] = React.useState<NestPhoneLessonContext | null>(null);
  const [loading, setLoading] = React.useState(Boolean(childId));
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadLesson = React.useCallback(async (): Promise<void> => {
    await performLessonLoad(childId, setLoading, setError, setLesson);
  }, [childId]);

  React.useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  const handleReady = async (): Promise<void> => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const context = await validateAndPrepareLesson(lesson, childId);
      if (!context) {
        setError('Add a child profile before starting a Nest lesson.');
        return;
      }
      setLesson(context);
      const navParams = extractLessonNavParams(context);
      navigation.navigate(ROUTES.GreetingScreen, navParams);
    } catch {
      setError('Could not load today\'s Nest lesson. Check the connection and try again.');
    } finally {
      setStarting(false);
    }
  };

  return { lesson, loading, starting, error, loadLesson, handleReady };
}

interface ScreenRenderProps {
  t: (key: string) => string;
  loading: boolean;
  error: string | null;
  childId: string | null;
  title: string;
  words: string[];
  lesson: NestPhoneLessonContext | null;
  starting: boolean;
  loadLesson: () => Promise<void>;
  handleReady: () => Promise<void>;
  navigation: NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>['navigation'];
}

function renderLessonReadyScreen({
  t,
  loading,
  error,
  childId,
  title,
  words,
  starting,
  loadLesson,
  handleReady,
  navigation,
}: ScreenRenderProps): React.ReactElement {
  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="600" style={styles.lessonLabel}>Today's Nest lesson</Text>
        {renderMainContent({
          loading,
          error,
          childId,
          title,
          words,
          onRetry: loadLesson,
          onAddChild: () => navigation.navigate(ROUTES.HomeChildProfileScreen),
          t,
        })}
      </Box>
      {renderFooter({
        shouldShow: !error,
        onPress: handleReady,
        disabled: loading || starting || !childId,
        isStarting: starting,
      })}
    </ScreenShell>
  );
}

export default function LessonReadyScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id ?? null;
  const { lesson, loading, starting, error, loadLesson, handleReady } = useLessonState(childId, navigation);

  const title = nestLessonTitle(lesson?.session);
  const words = extractLessonWords(lesson);

  return renderLessonReadyScreen({
    t,
    loading,
    error,
    childId,
    title,
    words,
    lesson,
    starting,
    loadLesson,
    handleReady,
    navigation,
  });
}

const styles = StyleSheet.create({
  center: { paddingTop: 118, paddingHorizontal: 28, paddingBottom: 190 },
  lessonLabel: { fontSize: 18, color: referenceColors.inkSoft, marginBottom: 6 },
  lessonTitle: { fontSize: 30, color: referenceColors.ink, marginBottom: 24, textAlign: 'center' },
  stateCard: {
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderWidth: 1,
    borderRadius: 28,
    marginTop: 24,
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    ...referenceShadow.card,
  },
  stateIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: referenceColors.bgWarm },
  stateTitle: { color: referenceColors.ink, fontSize: 20, textAlign: 'center' },
  stateDetail: { color: referenceColors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  stateAction: {
    alignItems: 'center',
    backgroundColor: referenceColors.primarySoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
  },
  stateActionText: { color: referenceColors.primaryDeep, fontSize: 14 },
  wordRow: { marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  wordPill: {
    backgroundColor: referenceColors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    ...referenceShadow.card,
  },
  wordPillText: { fontSize: 14, color: referenceColors.ink },
  headphonesPill: {
    marginTop: 12,
    backgroundColor: referenceColors.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    ...referenceShadow.card,
  },
  headphonesText: { fontSize: 14, color: referenceColors.inkSoft },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
