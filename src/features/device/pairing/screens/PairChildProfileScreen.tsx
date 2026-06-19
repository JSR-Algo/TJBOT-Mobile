import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ChildProfileScreen from '@/features/onboarding/screens/ChildProfileScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PairChildProfileScreen'>;

// Protected-stack wrapper for the from-pairing child creation path. The plain
// onboarding route stays owned by OnboardingNavigator; pairing needs the same UI
// registered inside ModalNavigator so the carried pairing context reaches
// finalizeDevicePairing after the child is saved.
export default function PairChildProfileScreen(props: Props): React.JSX.Element {
  return <ChildProfileScreen {...props} />;
}