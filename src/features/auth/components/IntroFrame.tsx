import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import IntroDots from './IntroDots';
import { referenceColors, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';

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
    <ScreenShell bg={referenceColors.bg}>
      <Box style={styles.navBar} flexDirection="row" alignItems="center" justifyContent="space-between">
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="introBackButton" accessibilityRole="button" accessibilityLabel="Go back">
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
        ) : null}
      </Box>
      <Box style={styles.center} alignItems="center" justifyContent="center">
        <Box style={[styles.illoCard, { backgroundColor: bg }]} alignItems="center" justifyContent="center">
          {illo}
        </Box>
        <Text fontWeight="600" style={styles.kicker}>{kicker}</Text>
        <Text fontWeight="800" style={styles.title}>{title}</Text>
        <Text fontWeight="600" style={styles.body}>{body}</Text>
      </Box>
      <Box style={styles.footer} alignItems="center" gap={18}>
        <IntroDots idx={idx} />
        <PrimaryCTA onPress={onNext} color={referenceColors.primary} testID="introNextButton">Next</PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  navBar: { position: 'absolute', top: 64, left: 18, right: 18, zIndex: 5 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: referenceColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...referenceShadow.card,
  },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 120, paddingHorizontal: 28, paddingBottom: 220, gap: 18 },
  illoCard: {
    width: 270,
    height: 230,
    borderRadius: referenceRadii.cardLarge,
    borderWidth: 1,
    borderColor: referenceColors.line,
    ...referenceShadow.card,
  },
  kicker: { fontSize: 12, color: referenceColors.inkMuted, textTransform: 'uppercase', letterSpacing: 0 },
  title: { fontSize: 30, color: referenceColors.ink, textAlign: 'center', lineHeight: 34, letterSpacing: 0, maxWidth: 320 },
  body: { fontSize: 15, color: referenceColors.inkSoft, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
