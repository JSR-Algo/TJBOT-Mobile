import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'AppErrorScreen'> & {
  error?: Error;
  reset?: () => void;
};

export default function AppErrorScreen({ navigation, error: _error, reset }: Props) {
  return (
    <ScreenShell>
      <Box flex={1} alignItems="center" justifyContent="center" padding={24}>
        <Robot emotion="worry" size={180} />
        <Text fontWeight="800" style={styles.title}>Something went wrong</Text>
        <Text style={styles.msg}>Something did not load. Your account and progress are safe.</Text>
        <Box flexDirection="row" gap={12} marginTop={24}>
          {reset ? (
            <PrimaryCTA color="#FF6F61" onPress={reset}>Try again</PrimaryCTA>
          ) : null}
          <PrimaryCTA color="#6FC1FF" onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}>
            Back home
          </PrimaryCTA>
          <PrimaryCTA
            color="#6FC1FF"
            onPress={() => navigation.navigate(ROUTES.SupportScreen, {
              context: { topic: 'app_error', errorFamily: 'app_error' },
            })}
          >
            Contact support
          </PrimaryCTA>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, color: '#2B2140', marginTop: 20, marginBottom: 8 },
  msg: { fontSize: 16, color: '#5C4F77', textAlign: 'center', lineHeight: 24 },
});
