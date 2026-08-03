import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { finishNestPhoneLesson, getActiveNestLesson } from '../nestPhoneLesson';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SuccessScreen'>;

export default function SuccessScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const activityIndex = route.params?.activityIndex ?? 1;
  const activityTotal = Math.max(route.params?.activityTotal ?? 1, 1);
  const word = getActiveNestLesson()?.session.session_payload?.core_learning?.[activityIndex - 1]?.word ?? 'word';
  const [finishing, setFinishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNext = async (): Promise<void> => {
    if (finishing) return;
    if (activityIndex < activityTotal) {
      navigation.navigate(ROUTES.RobotSpeakingScreen, {
        ...route.params,
        activityIndex: activityIndex + 1,
      });
      return;
    }

    setFinishing(true);
    setError(null);
    try {
      await finishNestPhoneLesson();
      navigation.navigate(ROUTES.LessonDoneScreen, {
        ...route.params,
        wordsLearned: activityTotal,
      });
    } catch {
      setError(t('Nest could not complete this lesson. Try again in a moment.'));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ScreenShell bg="#E8F8F0">
      <LessonHeader
        progress={Math.min(1, activityIndex / activityTotal)}
        onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen, route.params)}
      />
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center" gap={18}>
        <Robot emotion="success" size={150} accent="#E8A33C" />
        <SpeechBubble color="#fff">
          <Text style={{ color: '#7BD389' }}>{t('You practiced speaking!')}</Text>{'\n'}
          <Text i18n={false} style={styles.saidText}>{word}</Text>
        </SpeechBubble>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA disabled={finishing} onPress={handleNext} color="#7BD389">
          {activityIndex < activityTotal ? t('Next →') : t('Done')}
        </PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  saidText: { fontSize: 13.5, color: 'rgba(0,0,0,0.5)' },
  error: { fontSize: 13.5, color: '#B42318', textAlign: 'center' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
