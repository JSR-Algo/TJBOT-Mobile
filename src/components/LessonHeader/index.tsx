import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CircleBtn from '@/design-system/components/CircleBtn';
import { Icon } from '@/design-system/icons';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Props = {
  progress?: number;
  onExit?: () => void;
};

export default function LessonHeader({ progress = 0.4, onExit }: Props) {
  const boundedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <Box style={styles.root} flexDirection="row" alignItems="center" gap={12}>
      <CircleBtn size={42} onPress={onExit} ariaLabel="exit">
        <Icon name="X" size={18} color={referenceColors.ink} strokeWidth={3} />
      </CircleBtn>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${boundedProgress * 100}%` as DimensionValue }]} />
      </View>
      <Box
        accessible
        accessibilityLabel="12 lesson stars"
        style={styles.badge}
        flexDirection="row"
        alignItems="center"
        gap={4}
      >
        <Icon name="Star" size={15} color={referenceColors.gold} strokeWidth={2.5} />
        <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77' }}>
          12
        </Text>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 60,
    left: 18,
    right: 18,
    zIndex: 5,
  },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: referenceColors.success,
    borderRadius: 8,
  },
  badge: {
    backgroundColor: referenceColors.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    ...referenceShadow.card,
  },
});
