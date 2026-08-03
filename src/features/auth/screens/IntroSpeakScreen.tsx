import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import IntroFrame from '../components/IntroFrame';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroSpeakScreen'>;

export default function IntroSpeakScreen({ navigation }: Props) {
  const { t } = useAppLanguage();

  return (
    <IntroFrame
      idx={1}
      variant="card"
      onBack={() => navigation.navigate(ROUTES.IntroListenScreen)}
      onNext={() => navigation.navigate(ROUTES.IntroRetryScreen)}
      onSkip={() => navigation.navigate(ROUTES.TrustScreen)}
      header={t('Explore TeeBot')}
      title={t('Learn through play')}
      body={t('No tests, no pressure — just joy.')}
      nextLabel={t('Continue')}
      skipLabel={t('Skip')}
      stepLabel={t('2/3')}
      robotEmotion="curious"
      testID="introSpeakScreen"
    />
  );
}
