import { useState } from 'react';
import { ThemeContext } from '@/design-system/theme/ThemeContext.js';
import { themes } from '@/design-system/theme/themes.js';

export function ThemeProvider({ children, gender = 'default' }) {
  const [currentGender, setCurrentGender] = useState(gender);
  const theme = themes[currentGender] ?? themes.default;
  return (
    <ThemeContext.Provider value={{ theme, setGender: setCurrentGender }}>
      {children}
    </ThemeContext.Provider>
  );
}
