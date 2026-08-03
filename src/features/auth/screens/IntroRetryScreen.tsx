import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import IntroFrame from '../components/IntroFrame';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroRetryScreen'>;

export default function IntroRetryScreen({ navigation }: Props) {
  const { t } = useAppLanguage();

  return (
    <IntroFrame
      idx={2}
      variant="parent"
      onNext={() => navigation.navigate(ROUTES.TrustScreen)}
      onSkip={() => navigation.navigate(ROUTES.TrustScreen)}
      title={t('Parents are always alongside')}
      body={t('See what your child learned each week, right on your phone.')}
      nextLabel={t("Create your child's profile")}
      skipLabel={t('Skip')}
      stepLabel={t('Step 3/3')}
      robotEmotion="gentle"
      testID="introRetryScreen"
    />
  );
}
