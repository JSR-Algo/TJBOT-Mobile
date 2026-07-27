import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import IntroFrame from '../components/IntroFrame';
import { useAppLanguage } from '@/services/i18n/i18n';
type Props = NativeStackScreenProps<RootStackParamList, 'IntroCelebrateScreen'>;

export default function IntroCelebrateScreen({ navigation }: Props) {
  const { t } = useAppLanguage();

  return (
    <IntroFrame
      idx={2}
      variant="parent"
      onBack={() => navigation.navigate(ROUTES.IntroRetryScreen)}
      onNext={() => navigation.navigate(ROUTES.TrustScreen)}
      onSkip={() => navigation.navigate(ROUTES.TrustScreen)}
      title={t('Small wins, every day')}
      body={t('Each lesson is short and ends with a celebration. Built for 3–5 minutes a day.')}
      nextLabel={t('Continue')}
      skipLabel={t('Skip')}
      stepLabel={t('Step 3/3')}
      robotEmotion="happy"
      testID="introCelebrateScreen"
    />
  );
}
