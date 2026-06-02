import React from 'react';
import Screen from '@/components/Screen';
import { Text } from '@/design-system/primitives/Text';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'ParentStoppedScreen'>;
export default function ParentStoppedScreen(_props: Props) {
  return <Screen><Text>{'Session stopped from Parent Space.'}</Text></Screen>;
}
