import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  title?: string;
  onBack?: () => void;
  children?: React.ReactNode;
  screenTestID?: string;
  scrollTestID?: string;
};

export default function DeviceShell({ title, onBack, children, screenTestID, scrollTestID = 'deviceShellScroll' }: Props) {
  const { language } = useAppLanguage();
  return (
    <ScrollView
      testID={scrollTestID}
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <Box
        testID={screenTestID}
        collapsable={false}
        style={styles.header}
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
            accessibilityLabel={translateCopy('Go back', { locale: language })}
          >
            <BackIcon color={referenceColors.inkSoft} />
          </TouchableOpacity>
        ) : null}
        <Text fontWeight="800" style={styles.title}>
          {title}
        </Text>
      </Box>
      {children}
    </ScrollView>
  );
}

function BackIcon({ color }: { color: string }) {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: referenceColors.bg },
  content: { paddingBottom: 20 },
  header: {
    position: 'relative',
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 20,
    zIndex: 5,
  },
  title: {
    flex: 1,
    fontSize: 20,
    color: referenceColors.ink,
    letterSpacing: 0,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: referenceColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
