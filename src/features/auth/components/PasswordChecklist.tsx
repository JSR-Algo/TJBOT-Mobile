import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { OB } from '@/components/OnbShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Rule = { id: 'length' | 'uppercase' | 'number' | 'special'; label: string; met: boolean };

function buildRules(password: string): Rule[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*]/.test(password) },
  ];
}

type Props = {
  password: string;
  visible?: boolean;
};

export default function PasswordChecklist({ password, visible = true }: Props) {
  if (!visible) return null;

  const rules = buildRules(password);

  return (
    <Box accessibilityRole="list" style={styles.container} gap={6}>
      {rules.map(rule => (
        <Box
          key={rule.label}
          flexDirection="row"
          alignItems="center"
          gap={8}
          accessible
          accessibilityLabel={`${rule.label}: ${rule.met ? 'met' : 'not met'}`}
          testID={`passwordRule_${rule.id}_${rule.met ? 'met' : 'not_met'}`}
        >
          {rule.met ? <CheckIcon /> : <XIcon />}
          <Text style={[styles.label, rule.met ? styles.labelMet : styles.labelUnmet]}>
            {rule.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={OB.good} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

function XIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={OB.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 6 },
  label: { fontSize: 13, lineHeight: 18 },
  labelMet: { color: OB.good },
  labelUnmet: { color: OB.ink3 },
});
