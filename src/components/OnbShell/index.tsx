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
};

export default function OnbShell({ children, step, total, onBack, title, testID }: Props) {
  const { t } = useAppLanguage();
  return (
    <ScrollView
      style={[styles.root, { backgroundColor: OB.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      <Box
        style={[styles.header, { backgroundColor: OB.bg, borderBottomColor: OB.hair }]}
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
          <Text fontWeight="500" style={{ fontSize: 13, color: OB.ink3 }}>
            {step} of {total}
          </Text>
        ) : null}
      </Box>
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
});
