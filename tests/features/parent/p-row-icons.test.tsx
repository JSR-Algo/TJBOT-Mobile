import React from 'react';
import { render } from '@testing-library/react-native';
import PRow from '@/features/parent/components/PRow';

describe('PRow icons', () => {
  it.each(['📄', '✉️', '🌐', '🎤', '🔊', '📳', '📊', '🛡️', '⚙️', '❓', '?', 'ⓘ', '📅', '🗓️', '📖', '📚', '🗑️', '🩺', '✅', '👤'])(
    'renders %s as a vector icon',
    icon => {
      const { getByTestId, queryByText } = render(<PRow icon={icon} label="Row" />);

      expect(getByTestId('prow-icon')).toBeTruthy();
      expect(queryByText(icon)).toBeNull();
    },
  );

  it('preserves non-emoji string icons as text', () => {
    const { getByText, queryByTestId } = render(<PRow icon="A" label="Row" />);

    expect(getByText('A')).toBeTruthy();
    expect(queryByTestId('prow-icon')).toBeNull();
  });
});
