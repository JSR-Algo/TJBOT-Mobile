import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from '@xstate/react';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import WaveBars from '@/design-system/components/WaveBars';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useLessonSessionActor } from '../sessionContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectingScreen'>;

export default function ConnectingScreen({ navigation }: Props) {
  const actor = useLessonSessionActor();
  const stateValue = useSelector(actor, (snapshot) => snapshot.value);

  React.useEffect(() => {
    const flat = typeof stateValue === 'string' ? stateValue : Object.keys(stateValue)[0];

    switch (flat) {
      case 'ACTIVE':
        navigation.navigate(ROUTES.GreetingScreen);
        break;
      case 'RECONNECTING':
        navigation.navigate(ROUTES.ReconnectingScreen);
        break;
      case 'AUDIO_FAILED':
        navigation.navigate(ROUTES.AudioErrorScreen);
        break;
      case 'TIMED_OUT':
        navigation.navigate(ROUTES.TimedOutScreen);
        break;
      case 'COST_CAPPED':
        navigation.navigate(ROUTES.CostCappedScreen);
        break;
      case 'PARENT_STOPPED':
        navigation.navigate(ROUTES.ParentStoppedScreen);
        break;
      case 'SAFETY_HALT':
        navigation.navigate(ROUTES.SafetyScreen);
        break;
      case 'ABANDONED':
      case 'ABANDONED_DISCONNECT':
        navigation.navigate(ROUTES.HomeHubScreen);
        break;
      case 'COMPLETED':
        navigation.navigate(ROUTES.LessonDoneScreen);
        break;
      default:
        break;
    }
  }, [stateValue, navigation]);

  return (
    <ScreenShell bg="#E8F4FF">
      <Box accessible accessibilityLabel="Robot connection is tuning in" flex={1}>
        <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center" gap={28}>
          <Robot emotion="curious" size={220} />
          <Text fontWeight="700" style={styles.title}>Tuning in…</Text>
          <Box accessible accessibilityLabel="Connection activity">
            <WaveBars color="#6FC1FF" height={28} count={10} />
          </Box>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, color: '#1A1A1F' },
});
