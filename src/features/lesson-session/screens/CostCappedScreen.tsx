import React from 'react';
import { Text } from 'react-native';
import Screen from '@/components/Screen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'CostCappedScreen'>;
export default function CostCappedScreen(_props: Props) {
  return <Screen><Text>{'Session paused after reaching the daily limit.'}</Text></Screen>;
}
