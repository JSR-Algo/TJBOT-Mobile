import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import RobotImage from '@/components/RobotImage';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'AppErrorScreen'> & {
  error?: Error;
  reset?: () => void;
};

export default function AppErrorScreen({ navigation, error: _error, reset }: Props) {
  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <Box flex={1} alignItems="center" justifyContent="center" padding={24}>
        <Box style={styles.card} alignItems="center">
          <Box style={styles.robotStage} alignItems="center" justifyContent="center">
            <RobotImage variant="body" size={156} />
            <Box style={styles.errorBadge} alignItems="center" justifyContent="center">
              <Icon name="TriangleAlert" size={22} color="#C0392B" strokeWidth={2.4} />
            </Box>
          </Box>
          <Text fontWeight="800" style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>Something did not load. Your account and progress are safe.</Text>
        </Box>
        <Box gap={10} marginTop={24} style={styles.actions}>
          {reset ? (
            <DeviceBigBtn onClick={reset}>Try again</DeviceBigBtn>
          ) : null}
          <DeviceBigBtn
            secondary={Boolean(reset)}
            onClick={() => navigation.navigate(ROUTES.HomeHubScreen)}
          >
            Back home
          </DeviceBigBtn>
          <DeviceBigBtn
            secondary
            onClick={() => navigation.navigate(ROUTES.SupportScreen, {
              context: { topic: 'app_error', errorFamily: 'app_error' },
            })}
          >
            Contact support
          </DeviceBigBtn>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    ...referenceShadow.card,
  },
  robotStage: { width: 178, height: 178, borderRadius: 89, backgroundColor: referenceColors.bgWarm },
  errorBadge: {
    position: 'absolute',
    right: 4,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: referenceColors.primarySoft,
  },
  title: { fontSize: 28, color: referenceColors.ink, marginTop: 20, marginBottom: 8 },
  msg: { fontSize: 15, color: referenceColors.inkSoft, textAlign: 'center', lineHeight: 23 },
  actions: { width: '100%', maxWidth: 420 },
});
