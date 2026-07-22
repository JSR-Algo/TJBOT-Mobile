import React from 'react';
import { StyleSheet, Switch, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon, type IconName } from '@/design-system/icons';
import { PA } from './ParentScroll';

type Props = {
  icon?: string;
  label: string;
  value?: string;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  chevron?: boolean;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
};

const ROW_ICON_NAMES: Readonly<Record<string, IconName>> = {
  '📄': 'FileText',
  '✉': 'Mail',
  '🌐': 'Languages',
  '🎤': 'Mic',
  '🔊': 'Volume2',
  '📳': 'Vibrate',
  '📊': 'ChartNoAxesColumnIncreasing',
  '🛡': 'ShieldCheck',
  '⚙': 'Settings',
  '❓': 'CircleQuestionMark',
  '?': 'CircleQuestionMark',
  'ⓘ': 'Info',
  '📅': 'CalendarDays',
  '🗓': 'CalendarDays',
  '📖': 'BookOpen',
  '📚': 'BookOpen',
  '🗑': 'Trash2',
  '🩺': 'Stethoscope',
  '✅': 'CircleCheck',
  '👤': 'User',
};

export default function PRow({ icon, label, value, toggle, onToggle, chevron, danger, onPress, isLast }: Props) {
  const iconName = icon ? ROW_ICON_NAMES[icon.replace(/\uFE0F/g, '')] : undefined;
  const content = (
    <Box
      flexDirection="row"
      alignItems="center"
      gap={12}
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: PA.hair }]}
    >
      {icon ? (
        <Box style={styles.iconWrap} alignItems="center" justifyContent="center">
          {iconName ? (
            <Icon name={iconName} size={17} color={danger ? '#C0392B' : PA.ink3} testID="prow-icon" />
          ) : (
            <Text style={{ fontSize: 14 }}>{icon}</Text>
          )}
        </Box>
      ) : null}
      <Text style={[styles.label, danger && { color: '#C0392B', fontWeight: '500' }]}>{label}</Text>
      {value !== undefined ? (
        <Text style={styles.value}>{value}</Text>
      ) : null}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ true: PA.good }}
        />
      ) : null}
      {chevron ? (
        <Svg width={8} height={14} viewBox="0 0 8 14">
          <Path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </Svg>
      ) : null}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  row: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 14 },
  iconWrap: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#EEF1F5', flexShrink: 0 },
  label: { flex: 1, fontSize: 15, color: '#1A1A1F' },
  value: { fontSize: 14, color: '#5A5A66' },
});
