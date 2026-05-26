import React from 'react';
import { render } from '@testing-library/react-native';
import PasswordChecklist from '../../../src/features/auth/components/PasswordChecklist';

describe('PasswordChecklist', () => {
  it('renders all 4 rules', () => {
    const { getByLabelText } = render(<PasswordChecklist password="" />);
    expect(getByLabelText('At least 8 characters: not met')).toBeTruthy();
    expect(getByLabelText('One uppercase letter: not met')).toBeTruthy();
    expect(getByLabelText('One number: not met')).toBeTruthy();
    expect(getByLabelText('One special character (!@#$%^&*): not met')).toBeTruthy();
  });

  it('marks rule as met when password satisfies it', () => {
    const { getByLabelText } = render(<PasswordChecklist password="Abcdefg1!" />);
    expect(getByLabelText('At least 8 characters: met')).toBeTruthy();
    expect(getByLabelText('One uppercase letter: met')).toBeTruthy();
    expect(getByLabelText('One number: met')).toBeTruthy();
    expect(getByLabelText('One special character (!@#$%^&*): met')).toBeTruthy();
  });

  it('marks individual rules correctly for partial password', () => {
    const { getByLabelText } = render(<PasswordChecklist password="Abc" />);
    expect(getByLabelText('At least 8 characters: not met')).toBeTruthy();
    expect(getByLabelText('One uppercase letter: met')).toBeTruthy();
    expect(getByLabelText('One number: not met')).toBeTruthy();
    expect(getByLabelText('One special character (!@#$%^&*): not met')).toBeTruthy();
  });

  it('returns null when visible is false', () => {
    const { toJSON } = render(<PasswordChecklist password="Abc1!" visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('has accessibilityRole list on container', () => {
    const { UNSAFE_getByProps } = render(<PasswordChecklist password="" />);
    expect(UNSAFE_getByProps({ accessibilityRole: 'list' })).toBeTruthy();
  });
});
