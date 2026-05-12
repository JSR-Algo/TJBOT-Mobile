import React from 'react';
import { Text } from 'react-native';
import Screen from '@/components/Screen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'ParentLockedOutScreen'>;
export default function ParentLockedOutScreen(_props: Props) {
  return <Screen><Text>{'parent_locked_out (stub)'}</Text></Screen>;
}
