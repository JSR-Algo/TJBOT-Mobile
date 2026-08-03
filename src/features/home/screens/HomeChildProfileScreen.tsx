import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ChildProfileScreen from '@/features/onboarding/screens/ChildProfileScreen';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeChildProfileScreen'>;

export default function HomeChildProfileScreen({ navigation }: Props) {
  const returnHome = (): void => navigation.navigate(ROUTES.HomeHubScreen);

  return (
    <ChildProfileScreen
      navigation={navigation as never}
      route={{
        key: 'home-child-profile',
        name: ROUTES.ChildProfileScreen,
        params: undefined,
      } as never}
      onProtectedFlowExit={returnHome}
    />
  );
}
