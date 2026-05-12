import { createContext } from 'react';
import { defaultTheme, Theme } from './themes';

export const ThemeContext = createContext<Theme>(defaultTheme);
