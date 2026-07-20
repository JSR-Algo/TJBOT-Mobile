import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

const DV = {
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  ink3: '#8B8B96',
  hair: 'rgba(0,0,0,0.07)',
} as const;

type Props = {
  icon?: React.ReactNode;
  title?: string;
  body?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

export default function DeviceRow({ icon, title, body, right, onClick, danger }: Props) {
  const titleColor = danger ? '#C0392B' : DV.ink;

  return (
    <TouchableOpacity
      onPress={onClick}
      style={styles.root}
      activeOpacity={0.7}
    >
      {icon ? (
        <Box style={styles.iconWrap}>
          {icon}
        </Box>
      ) : null}
      <Box flex={1}>
        <Text fontWeight="500" style={{ fontSize: 15, color: titleColor, margintjtjbottom: body ? 2 : 0 }}>
          {title}
        </Text>
        {body ? (
          <Text style={{ fontSize: 13, color: DV.ink2, lineHeight: 18 }}>
            {body}
          </Text>
        ) : null}
      </Box>
      {right ?? <ChevronRight color={DV.ink3} />}
    </TouchableOpacity>
  );
}

function ChevronRight({ color }: { color: string }) {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    bordertjtjbottomWidth: 1,
    bordertjtjbottomColor: 'rgba(0,0,0,0.07)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#EEF1F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
