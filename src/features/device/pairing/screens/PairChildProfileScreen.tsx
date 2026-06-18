import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChildProfileContent } from '@/features/onboarding/screens/ChildProfileScreen';
import type { RootStackParamList } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairChildProfileScreen'>;

// Protected-stack wrapper for the from-pairing child creation path. The plain
// onboarding route stays owned by OnboardingNavigator; pairing needs the same UI
// registered inside ModalNavigator so the carried pairing context reaches
// finalizeDevicePairing after the child is saved.
export default function PairChildProfileScreen({ navigation, route }: Props): React.JSX.Element {
  return <ChildProfileContent navigation={navigation} route={route} />;
}
