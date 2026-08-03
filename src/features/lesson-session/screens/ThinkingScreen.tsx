import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useLessonHardwareBack } from '../hooks/useLessonHardwareBack';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ThinkingScreen'>;

export default function ThinkingScreen({ navigation, route }: Props) {
  // Android hardware-back during this active voice turn must funnel through
  // ExitConfirm, not silently pop the stack (MOB-2).
  useLessonHardwareBack(navigation, 'WAITING_AI');
  const { t } = useAppLanguage();
  React.useEffect(() => {
    const t = setTimeout(() => navigation.navigate(ROUTES.SuccessScreen, route.params), 1600);
    return () => clearTimeout(t);
  }, [navigation, route.params]);

  return (
    <ScreenShell bg="#E8F4FF">
      <Box flex={1}>
        <LessonHeader progress={0.34} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen, route.params)} />
        <Box
          style={[StyleSheet.absoluteFillObject, styles.center]}
          alignItems="center"
          gap={24}
          accessible
          accessibilityLabel={t('Robot is thinking')}
        >
          <RobotImage variant="head" size={140} />
          <Text fontWeight="700" style={styles.thinking}>Thinking…</Text>
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 24, paddingBottom: 200 },
  thinking: { fontSize: 20, color: 'rgba(0,0,0,0.5)' },
});
