import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';
import { Icon, type IconName } from '@/design-system/icons';

const DV = {
  ink: referenceColors.ink,
  ink2: referenceColors.inkSoft,
  ink3: referenceColors.inkMuted,
  hair: referenceColors.line,
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
  const { language } = useAppLanguage();
  const titleColor = danger ? '#C0392B' : DV.ink;
  const accessibilityLabel = [title, body]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(value => translateCopy(value, { locale: language }))
    .join('. ');
  const semanticIconName = typeof icon === 'string' ? icon as IconName : undefined;
  const renderedIcon = semanticIconName ? (
    <Icon
      name={semanticIconName}
      size={19}
      color={danger ? '#C0392B' : referenceColors.secondary}
      strokeWidth={2.3}
      testID="device-row-semantic-icon"
    />
  ) : typeof icon === 'number' ? (
    <Icon
      name="Circle"
      size={19}
      color={danger ? '#C0392B' : referenceColors.secondary}
      strokeWidth={2.3}
      testID="device-row-semantic-icon"
    />
  ) : icon;
  const content = (
    <>
      {icon ? (
        <Box style={styles.iconWrap}>
          {renderedIcon}
        </Box>
      ) : null}
      <Box flex={1}>
        <Text fontWeight="500" style={{ fontSize: 15, color: titleColor, marginBottom: body ? 2 : 0 }}>
          {title}
        </Text>
        {body ? (
          <Text style={{ fontSize: 13, color: DV.ink2, lineHeight: 18 }}>
            {body}
          </Text>
        ) : null}
      </Box>
      {right ?? (onClick ? <Icon name="ChevronRight" size={14} color={DV.ink3} strokeWidth={2.5} /> : null)}
    </>
  );

  if (!onClick) {
    return (
      <View style={styles.root} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onClick}
      style={styles.root}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DV.hair,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: referenceColors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
