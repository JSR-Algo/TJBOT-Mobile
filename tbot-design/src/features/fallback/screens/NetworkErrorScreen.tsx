import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'NetworkErrorScreen'>;

export default function NetworkErrorScreen({ navigation }: Props) {
  return (
    <ScreenShell bg="#E8E5F0">
      <TopBar onBack={() => navigation.navigate('HomeHubScreen')} />
      <Box style={[StyleSheet.absoluteFillObject, styles.content]} alignItems="center" justifyContent="center">
        <Robot emotion="worry" size={220} accent="#6B4A9B" />
        <SpeechBubble>Oops — I lost my signal.{'\n'}Let's try again in a sec.</SpeechBubble>
        <Box flexDirection="row" alignItems="center" gap={8} style={styles.noInternet}>
          <WifiIcon />
          <Text fontWeight="700" style={{ fontSize: 13, color: '#5C4F77' }}>No internet connection</Text>
        </Box>
      </Box>
      <Box style={styles.cta} gap={10}>
        <PrimaryCTA color="#6B4A9B" onPress={() => navigation.navigate('ReconnectingOverlay')}>Try again</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('HomeHubScreen')} activeOpacity={0.7}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77', textAlign: 'center' }}>Back home</Text>
        </TouchableOpacity>
      </Box>
    </ScreenShell>
  );
}

function WifiIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6B4A9B" strokeWidth={2} strokeLinecap="round">
      <Path d="M5 12.55a11 11 0 0114 0" />
      <Path d="M1.42 9a16 16 0 0121.16 0" />
      <Path d="M8.53 16.11a6 6 0 016.95 0" />
      <Line x1={12} y1={20} x2={12} y2={20} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 100, paddingBottom: 220, paddingHorizontal: 24, gap: 18 },
  noInternet: { backgroundColor: 'rgba(255,255,255,0.7)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  cta: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
