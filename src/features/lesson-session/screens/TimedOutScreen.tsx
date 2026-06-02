import React from 'react';
import Screen from '@/components/Screen';
import { Text } from '@/design-system/primitives/Text';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
type Props = NativeStackScreenProps<RootStackParamList, 'TimedOutScreen'>;
export default function TimedOutScreen(_props: Props) {
  return <Screen><Text>{'Session ended after no response.'}</Text></Screen>;
}
