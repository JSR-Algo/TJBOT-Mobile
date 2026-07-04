import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { OB } from '@/components/OnbShell';
import { Config } from '@/config';
import { Box } from '@/design-system/primitives/Box';
import { useAppLanguage } from '@/services/i18n/i18n';
import { Icon } from '@/design-system/icons';

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
  const { t } = useAppLanguage();

  return (
    <Box
      style={[styles.wrap, hasError && styles.wrapError]}
      flexDirection="row"
      alignItems="center"
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ? t(placeholder) : undefined}
        testID={testID}
        placeholderTextColor={OB.ink3}
        style={styles.input}
        secureTextEntry={!visible}
        autoComplete={Config.QA_MODE ? 'one-time-code' : undefined}
        autoCapitalize="none"
        importantForAutofill={Config.QA_MODE ? 'no' : undefined}
        textContentType={Config.QA_MODE ? 'oneTimeCode' : undefined}
        editable={editable}
      />
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        style={styles.eyeBtn}
        testID={testID ? `${testID}Toggle` : undefined}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('Hide password') : t('Show password')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name={visible ? 'EyeOff' : 'Eye'} size={20} color={OB.ink3} />
      </TouchableOpacity>
    </Box>
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
