import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenShell from '@/components/ScreenShell';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import IntroDots from './IntroDots';

type IntroVariant = 'hero' | 'card' | 'parent';
type RobotEmotion = React.ComponentProps<typeof Robot>['emotion'];

interface Props {
  idx: 0 | 1 | 2;
  variant: IntroVariant;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
  header?: string;
  title: string;
  body: string;
  nextLabel: string;
  skipLabel: string;
  stepLabel: string;
  robotEmotion: RobotEmotion;
  testID: string;
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={onPress}
      testID="introBackButton"
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18l-6-6 6-6"
          stroke={referenceColors.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

function SkipButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: 'pill' | 'outline' | 'plain';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID="introSkipButton"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.skipButton,
        variant === 'pill' && styles.skipPill,
        variant === 'outline' && styles.skipOutline,
        variant === 'plain' && styles.skipPlain,
      ]}
    >
      <Text
        fontWeight="800"
        style={[
          styles.skipLabel,
          variant === 'pill' && styles.skipPillLabel,
          variant === 'outline' && styles.skipOutlineLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function IntroFrame({
  idx,
  variant,
  onBack,
  onNext,
  onSkip,
  header,
  title,
  body,
  nextLabel,
  skipLabel,
  stepLabel,
  robotEmotion,
  testID,
}: Props) {
  if (variant === 'hero') {
    return (
      <ScreenShell bg="#E0F7FA" gradient={false} testID={testID}>
        <Box style={styles.page}>
          <Box style={styles.heroTop}>
            <SkipButton label={skipLabel} onPress={onSkip} variant="pill" />
          </Box>
          <Box style={styles.heroMain} alignItems="center">
            <Box style={styles.heroRobot} alignItems="center" justifyContent="center" testID="introRobot">
              <Box style={styles.aquaGlow} />
              <Robot emotion={robotEmotion} size={260} />
            </Box>
            <Text fontWeight="800" style={styles.heroTitle}>{title}</Text>
            <Text fontWeight="600" style={styles.heroBody}>{body}</Text>
          </Box>
          <Box style={styles.heroFooter} alignItems="center" gap={16}>
            <IntroDots idx={idx} />
            <Text fontWeight="800" style={styles.stepCoral}>{stepLabel}</Text>
            <PrimaryCTA onPress={onNext} color={referenceColors.primary} testID="introNextButton">
              {nextLabel}
            </PrimaryCTA>
          </Box>
        </Box>
      </ScreenShell>
    );
  }

  if (variant === 'card') {
    return (
      <ScreenShell bg={referenceColors.bg} gradient={false} testID={testID}>
        <Box style={styles.page}>
          <Box style={styles.cardHeader} flexDirection="row" alignItems="center" justifyContent="space-between">
            {onBack ? <BackButton onPress={onBack} /> : <Box style={styles.backButton} />}
            <Text fontWeight="800" style={styles.headerTitle}>{header}</Text>
            <Text fontWeight="800" style={styles.headerStep}>{stepLabel}</Text>
          </Box>
          <Box style={styles.discoveryCard} alignItems="center">
            <Box style={styles.cardDecoration} />
            <Box style={styles.cardRobot} alignItems="center" justifyContent="center" testID="introRobot">
              <Robot emotion={robotEmotion} size={225} />
            </Box>
            <Text fontWeight="800" style={styles.cardTitle}>{title}</Text>
            <Text fontWeight="600" style={styles.cardBody}>{body}</Text>
          </Box>
          <Box style={styles.cardFooter} gap={24}>
            <IntroDots idx={idx} />
            <Box flexDirection="row" gap={12}>
              <Box style={styles.skipFlex}>
                <SkipButton label={skipLabel} onPress={onSkip} variant="outline" />
              </Box>
              <Box style={styles.nextFlex}>
                <PrimaryCTA onPress={onNext} color={referenceColors.primary} testID="introNextButton">
                  {nextLabel}
                </PrimaryCTA>
              </Box>
            </Box>
          </Box>
        </Box>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell bg="#FFFBF0" gradient={false} testID={testID}>
      <Box style={styles.page}>
        <Box style={styles.parentMain} alignItems="center">
          <Box style={styles.parentRobot} alignItems="center" justifyContent="center" testID="introRobot">
            <Box style={styles.yellowGlow} />
            <Robot emotion={robotEmotion} size={255} />
          </Box>
          <Text fontWeight="800" style={styles.parentTitle}>{title}</Text>
          <Text fontWeight="600" style={styles.parentBody}>{body}</Text>
        </Box>
        <Box style={styles.parentFooter} alignItems="center" gap={18}>
          <IntroDots idx={idx} />
          <Text fontWeight="800" style={styles.stepMuted}>{stepLabel}</Text>
          <PrimaryCTA onPress={onNext} color={referenceColors.primary} testID="introNextButton">
            {nextLabel}
          </PrimaryCTA>
          <SkipButton label={skipLabel} onPress={onSkip} variant="plain" />
        </Box>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 52,
    paddingBottom: 36,
  },
  heroTop: {
    minHeight: 44,
    alignItems: 'flex-end',
  },
  heroMain: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  heroRobot: {
    width: 278,
    height: 278,
    marginBottom: 14,
  },
  aquaGlow: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    backgroundColor: 'rgba(78,205,196,0.13)',
  },
  heroTitle: {
    color: referenceColors.ink,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroBody: {
    color: referenceColors.inkSoft,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 330,
  },
  heroFooter: {
    width: '100%',
  },
  stepCoral: {
    color: referenceColors.primary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: referenceColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.45)',
    ...referenceShadow.card,
  },
  cardHeader: {
    width: '100%',
    marginBottom: 28,
  },
  headerTitle: {
    color: referenceColors.ink,
    fontSize: 18,
  },
  headerStep: {
    width: 48,
    color: referenceColors.primary,
    fontSize: 12,
    textAlign: 'right',
  },
  discoveryCard: {
    flex: 1,
    minHeight: 420,
    backgroundColor: referenceColors.card,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.5)',
    paddingHorizontal: 26,
    paddingTop: 24,
    overflow: 'hidden',
    ...referenceShadow.card,
  },
  cardDecoration: {
    position: 'absolute',
    top: -58,
    right: -58,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(78,205,196,0.07)',
  },
  cardRobot: {
    width: 235,
    height: 235,
    marginBottom: 12,
  },
  cardTitle: {
    color: referenceColors.ink,
    fontSize: 29,
    lineHeight: 35,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardBody: {
    color: referenceColors.inkSoft,
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 300,
  },
  cardFooter: {
    marginTop: 24,
  },
  skipFlex: {
    flex: 1,
  },
  nextFlex: {
    flex: 2,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPill: {
    minWidth: 82,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  skipOutline: {
    minHeight: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(235,220,199,0.75)',
    backgroundColor: referenceColors.card,
  },
  skipPlain: {
    minHeight: 44,
    paddingHorizontal: 20,
  },
  skipLabel: {
    color: referenceColors.inkSoft,
    fontSize: 17,
  },
  skipPillLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  skipOutlineLabel: {
    fontSize: 18,
  },
  parentMain: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  parentRobot: {
    width: 272,
    height: 272,
    marginBottom: 20,
  },
  yellowGlow: {
    position: 'absolute',
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: 'rgba(255,230,109,0.22)',
  },
  parentTitle: {
    color: referenceColors.ink,
    fontSize: 31,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 12,
  },
  parentBody: {
    color: referenceColors.inkSoft,
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 330,
  },
  parentFooter: {
    width: '100%',
  },
  stepMuted: {
    color: referenceColors.inkSoft,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
