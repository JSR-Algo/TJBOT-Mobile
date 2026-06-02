import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  header?: string;
  footer?: string;
  children?: React.ReactNode;
};

export default function PRowGroup({ header, footer, children }: Props) {
  const { language } = useAppLanguage();
  const translatedHeader = header ? translateCopy(header, { locale: language }).toUpperCase() : null;
  return (
    <Box paddingHorizontal={16} paddingTop={14}>
      {translatedHeader ? (
        <Text fontWeight="600" style={styles.header} i18n={false}>{translatedHeader}</Text>
      ) : null}
      <Box style={styles.card} borderRadius={14} overflow="hidden">
        {children}
      </Box>
      {footer ? (
        <Text style={styles.footer}>{footer}</Text>
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 12, color: '#8B8B96', paddingHorizontal: 4, paddingBottom: 6, letterSpacing: 0.6 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  footer: { fontSize: 12, color: '#8B8B96', paddingHorizontal: 4, paddingTop: 8, lineHeight: 17 },
});
