import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'SpeakerTestScreen'>;

export default function SpeakerTestScreen({ navigation }: Props): React.JSX.Element {
  return (
    <DeviceShell title="Speaker test" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <ConnectorStateNotice state="unsupported_until_connector" />
      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30} gap={10}>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>
          Back to My Robot
        </DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.SupportScreen)}>
          Contact support
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}
