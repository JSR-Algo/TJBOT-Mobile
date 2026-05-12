import React from 'react';
import { Text } from 'react-native';
import Screen from '@/components/Screen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'TimedOutScreen'>;
export default function TimedOutScreen(_props: Props) {
  return <Screen><Text>{'timed_out (stub)'}</Text></Screen>;
}
