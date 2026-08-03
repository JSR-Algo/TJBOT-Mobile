import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon, type IconName } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Tone = 'neutral' | 'warning' | 'danger';

type Props = {
  icon: IconName;
  title: string;
  body: string;
  tone?: Tone;
  testID?: string;
};

const TONES: Record<Tone, { background: string; foreground: string }> = {
  neutral: {
    background: referenceColors.lavenderSoft,
    foreground: referenceColors.lavender,
  },
  warning: {
    background: referenceColors.goldSoft,
    foreground: '#8A6A12',
  },
  danger: {
    background: referenceColors.primarySoft,
    foreground: referenceColors.primaryDeep,
  },
};

export default function PurchaseStatusCard({
  icon,
  title,
  body,
  tone = 'neutral',
  testID,
}: Props): React.JSX.Element {
  const colors = TONES[tone];
  return (
    <Box
      testID={testID}
      style={styles.card}
      alignItems="center"
      accessibilityLabel={`${title}. ${body}`}
    >
      <Box
        style={[styles.iconWrap, { backgroundColor: colors.background }]}
        alignItems="center"
        justifyContent="center"
      >
        <Icon name={icon} size={30} color={colors.foreground} strokeWidth={2.2} />
      </Box>
      <Text fontWeight="800" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 236,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: referenceColors.line,
    backgroundColor: referenceColors.card,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    ...referenceShadow.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
  },
  title: {
    marginTop: 18,
    color: referenceColors.ink,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    color: referenceColors.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
