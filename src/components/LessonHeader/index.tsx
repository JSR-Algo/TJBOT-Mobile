import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CircleBtn from '@/design-system/components/CircleBtn';

type Props = {
  progress?: number;
  onExit?: () => void;
};

export default function LessonHeader({ progress = 0.4, onExit }: Props) {
  return (
    <Box style={styles.root} flexDirection="row" alignItems="center" gap={12}>
      <CircleBtn size={42} onPress={onExit} ariaLabel="exit">
        <CloseIcon />
      </CircleBtn>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as DimensionValue }]} />
      </View>
      <Box style={styles.badge}>
        <Text fontWeight="700" style={{ fontSize: 14, color: '#5C4F77' }}>
          ⭐ 12
        </Text>
      </Box>
    </Box>
  );
}

function CloseIcon() {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <Path d="M5 5l14 14M19 5L5 19" />
    </Svg>
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
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#7AC9A0',
    borderRadius: 8,
  },
  badge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});
