import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  maxLength?: number;
  style?: ViewStyle;
  editable?: boolean;
  testID?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  maxLength,
  style,
  editable = true,
  testID,
}: InputProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        focused && styles.inputFocused,
        error ? styles.inputError : null,
        !editable && styles.inputDisabled,
      ]}>
        <TextInput
          style={[styles.input, secureTextEntry && styles.inputWithToggle]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && hidePassword}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={secureTextEntry ? 'none' : autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          testID={testID}
          autoCorrect={false}
          spellCheck={false}
          autoComplete={
            secureTextEntry
              ? 'off'
              : keyboardType === 'email-address'
                ? 'email'
                : 'off'
          }
          textContentType={secureTextEntry ? 'oneTimeCode' : 'none'}
          importantForAutofill="no"
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidePassword(!hidePassword)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            <Text style={styles.eyeIcon}>{hidePassword ? '\u{1F441}' : '\u{1F648}'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    ...typography.body1,
    color: colors.textPrimary,
  },
  inputWithToggle: {
    paddingRight: spacing.xs,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.divider,
  },
  eyeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
