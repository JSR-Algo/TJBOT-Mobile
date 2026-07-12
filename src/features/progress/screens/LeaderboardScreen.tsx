import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LeaderboardView from '@/features/rewards/screens/LeaderboardView';

type Props = NativeStackScreenProps<RootStackParamList, 'LeaderboardScreen'>;

export default function LeaderboardScreen(props: Props): React.JSX.Element {
  return <LeaderboardView {...props} />;
}
