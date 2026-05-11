import { colors } from '../tokens/colors.js';

export const defaultTheme = {
  ...colors,
};

export const girlTheme = {
  ...defaultTheme,
  coral: '#FF8FB1',
  coralSoft: '#FFD8E5',
  sky: '#FFA6C2',
  skySoft: '#FFE2EC',
  sun: '#FFB6CF',
  plum: '#C25E8A',
  paper2: '#FFEEF4',
  dangerSoft: '#FFD2E2',
  bot: {
    ...defaultTheme.bot,
    cheek: '#FFB3CB',
    body: '#FFEEF4',
    body2: '#FFD2E2',
    shadow: '#E08AAB',
  },
};

export const boyTheme = {
  ...defaultTheme,
  coral: '#5DAEFF',
  coralSoft: '#DCEEFF',
  sky: '#5DAEFF',
  skySoft: '#DCEEFF',
  sun: '#8AC6FF',
  plum: '#4878B0',
  paper2: '#E8F4FF',
  dangerSoft: '#DCEEFF',
  bot: {
    ...defaultTheme.bot,
    cheek: '#B3D9F5',
    body: '#E8F4FF',
    body2: '#C5E0FA',
    shadow: '#6FA8DC',
  },
};

export const themes = { default: defaultTheme, girl: girlTheme, boy: boyTheme };

export default themes;
