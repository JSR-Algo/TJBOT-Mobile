import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
  dark?: boolean;
  onBack?: () => void;
};

export default function TopBar({ left, right, title, dark, onBack }: Props) {
  const { t } = useAppLanguage();
  const fg = dark ? referenceColors.card : referenceColors.ink;
  return (
    <Box style={styles.root}>
      <Box>
        {left}
        {!left && onBack ? (
          <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel={t('Back to home')} style={styles.backBtn}>
            <Text fontWeight="800" style={{ fontSize: 24, color: fg }}>‹</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
      {title ? (
        <Text fontWeight="700" style={{ fontSize: 18, color: fg }}>
          {title}
        </Text>
      ) : null}
      <Box>{right}</Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
