import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceSessionScreen'>;

export default function DeviceSessionScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Lesson on Robot" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
      <Box testID="device-session-unsupported" paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>Live lesson view is not ready yet</Text>
        <Text style={styles.body}>
          This screen will show what Robot is teaching when the live lesson view is ready. Pairing a Robot does not enable this view yet.
        </Text>
      </Box>

      <Box paddingHorizontal={20} paddingTop={30} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
          Browse courses
        </DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
          Back to Robot home
        </DeviceBigBtn>
      </Box>

      <Box paddingHorizontal={20} paddingBottom={30}>
        <Text style={styles.disclaimer}>Audio stays between Robot and your child. Recordings are not saved.</Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: DV.ink,
    fontSize: 20,
    letterSpacing: -0.3,
    marginTop: 18,
    maxWidth: 300,
    textAlign: 'center',
  },
  body: {
    color: DV.ink2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
    textAlign: 'center',
  },
  disclaimer: {
    color: DV.ink3,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
});
