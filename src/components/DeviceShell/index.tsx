import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

const DV = {
  bg: '#F5F5F2',
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
} as const;

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
      style={[styles.root, { backgroundColor: DV.bg }]}
    >
      <Box
        testID={screenTestID}
        collapsable={false}
        style={[styles.header, { backgroundColor: DV.bg, borderBottomColor: DV.hair }]}
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
            <BackIcon color={DV.ink2} />
          </TouchableOpacity>
        ) : null}
        <Text fontWeight="600" style={{ flex: 1, fontSize: 17, color: DV.ink, letterSpacing: -0.2 }}>
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
  root: { flex: 1 },
  header: {
    position: 'relative',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
