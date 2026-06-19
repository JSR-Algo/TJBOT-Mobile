import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CircleBtn from '@/design-system/components/CircleBtn';
import { referenceColors } from '@/design-system/referenceTheme';
import { Path, Svg } from 'react-native-svg';

interface PageHeaderProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function PageHeader({ left, right, title, subtitle, onBack }: PageHeaderProps) {
  return (
    <Box style={styles.container}>
      <Box style={styles.row}>
        {left ?? (onBack ? (
          <CircleBtn size={42} onPress={onBack} ariaLabel="Back">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={referenceColors.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 5l-7 7 7 7" stroke={referenceColors.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </CircleBtn>
        ) : <Box style={{ width: 42 }} />)}
        {right}
      </Box>
      {title != null && (
        <Box>
          {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.title}>{title}</Text>
        </Box>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 62,
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontWeight: '600',
    fontSize: 14,
    color: referenceColors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    fontWeight: '800',
    fontSize: 30,
    color: referenceColors.ink,
    letterSpacing: 0,
  },
});
