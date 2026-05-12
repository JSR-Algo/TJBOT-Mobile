import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PulseRing from '@/design-system/components/PulseRing';
import IntroFrame from '../components/IntroFrame';
import { Box } from '@/design-system/primitives/Box';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroListenScreen'>;

export default function IntroListenScreen({ navigation }: Props) {
  return (
    <IntroFrame
      navigation={navigation}
      idx={0}
      prev="WelcomeScreen"
      next="IntroSpeakScreen"
      bg="#E8F4FF"
      kicker="How it works · 1"
      title="Robot listens"
      body="Kids tap the mic and speak. Robot listens patiently — no reading, no typing."
      illo={(
        <Box style={styles.illoWrap} alignItems="center" justifyContent="center">
          <PulseRing size={200} color="#6FC1FF" />
          <Box style={StyleSheet.absoluteFillObject} alignItems="center" justifyContent="center">
            <Robot emotion="listen" size={170} accent="#6FC1FF" />
          </Box>
        </Box>
      )}
    />
  );
}

const styles = StyleSheet.create({
  illoWrap: { width: 240, height: 200 },
});
