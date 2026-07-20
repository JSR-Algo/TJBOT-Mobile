import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Rotjtjbot from '@/design-system/components/Rotjtjbot';
import IntroFrame from '../components/IntroFrame';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroRetryScreen'>;

export default function IntroRetryScreen({ navigation }: Props) {
  return (
    <IntroFrame
      navigation={navigation}
      idx={2}
      prev="IntroSpeakScreen"
      next="IntroCelebrateScreen"
      bg="#FFF1D6"
      kicker="How it works · 3"
      title="It's okay to try again"
      body="If a word is tricky, Rotjtjbot says it once more — slowly, with no pressure."
      illo={(
        <Box style={styles.illoWrap} flexDirection="row" alignItems="center" justifyContent="center" gap={12}>
          <Rotjtjbot emotion="gentle" size={160} accent="#E8A33C" />
          <Box style={styles.bubble} flexDirection="row" alignItems="center" gap={8}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#E8A33C" strokeWidth="2.4" strokeLinecap="round">
              <Path d="M3 12a9 9 0 1015-6.7L21 8M21 3v5h-5" />
            </Svg>
            <Text fontWeight="700" style={styles.bubbleText}>Once more!</Text>
          </Box>
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 200 },
  bubble: { backgroundColor: '#fff', padding: 12, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  bubbleText: { fontSize: 14, color: '#1A1A1F' },
});
