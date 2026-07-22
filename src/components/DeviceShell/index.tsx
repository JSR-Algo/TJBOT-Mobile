import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';
import { Icon } from '@/design-system/icons';

type Props = {
  title?: string;
  onBack?: () => void;
  children?: React.ReactNode;
  screenTestID?: string;
  scrollTestID?: string;
};

export default function DeviceShell({ title, onBack, children, screenTestID, scrollTestID = 'deviceShellScroll' }: Props) {
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={scrollTestID}
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Box
        testID={screenTestID}
        collapsable={false}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
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
            <Icon name="ChevronLeft" size={18} color={referenceColors.inkSoft} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: referenceColors.bg },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 130,
  },
  header: {
    position: 'relative',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    zIndex: 5,
  },
  title: {
    flex: 1,
    fontSize: 29,
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
