import React, { useState } from 'react';
import { ThemeContext } from '@/design-system/theme/ThemeContext';
import { themes } from '@/design-system/theme/themes';

type Gender = keyof typeof themes;

type Props = {
  children: React.ReactNode;
  gender?: Gender;
};

export function ThemeProvider({ children, gender = 'default' }: Props) {
  const [currentGender] = useState<Gender>(gender);
  const theme = (themes[currentGender] ?? themes.default) as typeof themes.default;
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
