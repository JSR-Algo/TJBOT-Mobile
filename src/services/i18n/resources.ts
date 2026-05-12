import en from './locales/en.json';
import vi from './locales/vi.json';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

export type Locale = keyof typeof resources;
