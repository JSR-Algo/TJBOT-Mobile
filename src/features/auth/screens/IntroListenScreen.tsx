import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import IntroFrame from '../components/IntroFrame';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroListenScreen'>;

export default function IntroListenScreen({ navigation }: Props) {
  const { t } = useAppLanguage();

  return (
    <IntroFrame
      idx={0}
      variant="hero"
      onNext={() => navigation.navigate(ROUTES.IntroSpeakScreen)}
      onSkip={() => navigation.navigate(ROUTES.TrustScreen)}
      title={t('Learn through play')}
      body={t('TeeBot guides your child step by step, helping them speak English with confidence.')}
      nextLabel={t('Start learning with TeeBot')}
      skipLabel={t('Skip')}
      stepLabel={t('Step 1/3')}
      robotEmotion="speak"
      testID="introListenScreen"
    />
  );
}
