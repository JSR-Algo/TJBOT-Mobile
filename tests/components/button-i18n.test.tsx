import React from 'react';
import { render } from '@testing-library/react-native';
import { Button } from '@/components/Button';
import { StatusIndicator } from '@/components/gemini/StatusIndicator';
import { setAppLanguage } from '@/services/i18n/i18n';

describe('Button localization', () => {
  it('renders and announces the Vietnamese label', async () => {
    await setAppLanguage('vi');

    const screen = render(<Button label="Restart" onPress={() => undefined} />);

    expect(screen.getByText('Khởi động lại')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Khởi động lại');
    expect(screen.queryByText('Restart')).toBeNull();
  });

  it('keeps the English label in English mode', async () => {
    await setAppLanguage('en');

    const screen = render(<Button label="Restart" onPress={() => undefined} />);

    expect(screen.getByText('Restart')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityLabel).toBe('Restart');
  });
});

describe('Gemini status localization', () => {
  it('renders the idle voice state in Vietnamese', async () => {
    await setAppLanguage('vi');

    const screen = render(<StatusIndicator state="IDLE" />);

    expect(screen.getByText('Sẵn sàng trò chuyện')).toBeTruthy();
    expect(screen.queryByText('Ready to talk')).toBeNull();
  });

  it('renders the idle voice state in English', async () => {
    await setAppLanguage('en');

    const screen = render(<StatusIndicator state="IDLE" />);

    expect(screen.getByText('Ready to talk')).toBeTruthy();
  });
});
