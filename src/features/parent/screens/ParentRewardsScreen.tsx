import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentRewardsView from '@/features/rewards/screens/ParentRewardsView';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentRewardsScreen'>;

export default function ParentRewardsScreen(props: Props): React.JSX.Element {
  return <ParentRewardsView {...props} />;
}
