import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PasswordInput from '../../../src/features/auth/components/PasswordInput';

describe('PasswordInput', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <PasswordInput value="" onChangeText={jest.fn()} placeholder="Password" />,
    );
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('toggles secureTextEntry on eye icon press', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <PasswordInput value="secret" onChangeText={jest.fn()} placeholder="Password" />,
    );
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    fireEvent.press(getByLabelText('Show password'));
    expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(false);
  });

  it('changes accessibilityLabel on toggle', () => {
    const { getByLabelText, queryByLabelText } = render(
      <PasswordInput value="" onChangeText={jest.fn()} />,
    );
    expect(getByLabelText('Show password')).toBeTruthy();
    expect(queryByLabelText('Hide password')).toBeNull();

    fireEvent.press(getByLabelText('Show password'));
    expect(getByLabelText('Hide password')).toBeTruthy();
    expect(queryByLabelText('Show password')).toBeNull();
  });

  it('applies red border style when hasError is true', () => {
    const { UNSAFE_getByType } = render(
      <PasswordInput value="" onChangeText={jest.fn()} hasError />,
    );
    const { View } = require('react-native');
    const wrapper = UNSAFE_getByType(View);
    const flatStyle = wrapper.props.style?.flat?.() ?? wrapper.props.style;
    const styleStr = JSON.stringify(flatStyle);
    expect(styleStr).toContain('#F95F50');
  });
});
