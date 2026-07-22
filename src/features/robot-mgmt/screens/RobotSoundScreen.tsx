import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotSoundScreen'>;

export default function RobotSoundScreen({ navigation }: Props): React.JSX.Element {
  return (
    <DeviceShell title="Sound & volume" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <ConnectorStateNotice state="unsupported_until_connector" />
      <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30}>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>
          Back to My Robot
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}
