import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { OB } from '@/components/OnbShell';
import { Box } from '@/design-system/primitives/Box';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  testID?: string;
  hasError?: boolean;
  editable?: boolean;
};

export default function PasswordInput({ value, onChangeText, placeholder, testID, hasError, editable = true }: Props) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Box
      style={[styles.wrap, hasError && styles.wrapError]}
      flexDirection="row"
      alignItems="center"
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        placeholderTextColor={OB.ink3}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        editable={editable}
      />
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        style={styles.eyeBtn}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </TouchableOpacity>
    </Box>
  );
}

function EyeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={OB.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={OB.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
      <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: OB.card,
    borderWidth: 1,
    borderColor: OB.hair,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  wrapError: {
    borderColor: OB.danger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: OB.ink,
    paddingVertical: 10,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
