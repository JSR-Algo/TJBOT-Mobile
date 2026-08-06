import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { useAppLanguage } from '@/services/i18n/i18n';
import { Icon } from '@/design-system/icons';

// RE-SKIN: bridged onto the local reference UI. Key names stay stable so all
// onboarding consumers inherit the updated cream, coral, teal, and warm-card look.
export const OB = {
  bg: referenceColors.bg,
  card: referenceColors.card,
  ink: referenceColors.ink,
  ink2: referenceColors.inkSoft,
  ink3: referenceColors.inkMuted,
  hair: referenceColors.line,
  accent: referenceColors.primary,
  good: referenceColors.success,
  danger: referenceColors.primaryDeep,
  dangerSoft: referenceColors.primarySoft,
} as const;

type Props = {
  children?: React.ReactNode;
  step?: number;
  total?: number;
  onBack?: () => void;
  title?: string;
  testID?: string;
  backgroundColor?: string;
};

export default function OnbShell({
  children,
  step,
  total,
  onBack,
  title,
  testID,
  backgroundColor = OB.bg,
}: Props) {
  const { t } = useAppLanguage();
  const progress = step != null && total != null && total > 0
    ? Math.min(1, Math.max(0, step / total))
    : null;
  return (
    <ScrollView
      style={[styles.root, { backgroundColor }]}
      contentContainerStyle={[styles.content, { backgroundColor }]}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      <Box
        style={[styles.header, { backgroundColor, borderBottomColor: OB.hair }]}
        flexDirection="row"
        alignItems="center"
        gap={12}
      >
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Go back')}
          >
            <Icon name="ChevronLeft" size={18} color={OB.ink2} />
          </TouchableOpacity>
        ) : null}
        <Text fontWeight="700" style={{ flex: 1, fontSize: 17, color: OB.ink, letterSpacing: 0 }}>
          {title}
        </Text>
        {step != null && total != null ? (
          <Text fontWeight="800" style={styles.stepPill}>
            {t(`Step ${step}/${total}`)}
          </Text>
        ) : null}
      </Box>
      {progress != null ? (
        <Box
          style={styles.progressTrack}
          testID="onboardingProgress"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: step }}
        >
          <Box style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </Box>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 130,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    ...referenceShadow.card,
  },
  stepPill: {
    fontSize: 11,
    color: OB.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressTrack: {
    height: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.45)',
    padding: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: referenceColors.secondary,
  },
});
