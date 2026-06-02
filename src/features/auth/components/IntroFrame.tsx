import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import IntroDots from './IntroDots';

interface Props {
  idx: number;
  onBack?: () => void;
  onNext: () => void;
  bg: string;
  kicker: string;
  title: string;
  body: string;
  illo: React.ReactNode;
}

export default function IntroFrame({ idx, onBack, onNext, bg, kicker, title, body, illo }: Props) {
  return (
    <ScreenShell bg={bg}>
      <Box style={styles.navBar} flexDirection="row" alignItems="center" justifyContent="space-between">
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
        ) : null}
      </Box>
      <Box style={styles.center} alignItems="center" justifyContent="center">
        {illo}
        <Text fontWeight="600" style={styles.kicker}>{kicker}</Text>
        <Text fontWeight="800" style={styles.title}>{title}</Text>
        <Text fontWeight="600" style={styles.body}>{body}</Text>
      </Box>
      <Box style={styles.footer} alignItems="center" gap={18}>
        <IntroDots idx={idx} />
        <PrimaryCTA onPress={onNext} color="#FF6F61" testID="introNextButton">Next</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  navBar: { position: 'absolute', top: 64, left: 18, right: 18, zIndex: 5 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 120, paddingHorizontal: 28, paddingBottom: 220, gap: 18 },
  kicker: { fontSize: 13, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { fontSize: 30, color: '#1A1A1F', textAlign: 'center', lineHeight: 33, letterSpacing: -0.3, maxWidth: 320 },
  body: { fontSize: 15, color: 'rgba(0,0,0,0.5)', textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
