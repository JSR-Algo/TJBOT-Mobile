import React from 'react';
import ChildProfileScreen from '@/features/onboarding/screens/ChildProfileScreen';

// Protected-stack wrapper for the from-pairing child creation path. The plain
// onboarding route stays owned by OnboardingNavigator; pairing needs the same UI
// registered inside ModalNavigator so the carried pairing context reaches
// finalizeDevicePairing after the child is saved.
export default function PairChildProfileScreen(props: React.ComponentProps<typeof ChildProfileScreen>): React.JSX.Element {
  return <ChildProfileScreen {...props} />;
}
