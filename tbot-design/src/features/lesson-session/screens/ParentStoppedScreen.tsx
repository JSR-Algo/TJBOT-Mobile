import React from 'react';
import { Text } from 'react-native';
import Screen from '@/components/Screen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'ParentStoppedScreen'>;
export default function ParentStoppedScreen(_props: Props) {
  return <Screen><Text>{'parent_stopped (stub)'}</Text></Screen>;
}
