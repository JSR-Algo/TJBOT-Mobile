import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import WaveBars from '@/design-system/components/WaveBars';
import IntroFrame from '../components/IntroFrame';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroSpeakScreen'>;

export default function IntroSpeakScreen({ navigation }: Props) {
  return (
    <IntroFrame
      navigation={navigation}
      idx={1}
      prev={ROUTES.IntroListenScreen}
      next={ROUTES.IntroRetryScreen}
      bg="#E8F8F0"
      kicker="How it works · 2"
      title="Robot speaks back"
      body="Robot replies out loud, so kids hear how words really sound."
      illo={(
        <Box style={styles.illoWrap} flexDirection="row" alignItems="center" justifyContent="center" gap={14}>
          <Robot emotion="speak" size={160} accent="#7BD389" />
          <Box gap={8}>
            <Box style={styles.bubble}>
              <Text fontWeight="700" style={styles.bubbleText}>"Hello!"</Text>
            </Box>
            <WaveBars count={8} color="#7BD389" height={26} />
          </Box>
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 200 },
  bubble: { backgroundColor: '#fff', padding: 10, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  bubbleText: { fontSize: 14, color: '#1A1A1F' },
});
