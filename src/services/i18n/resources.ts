import en from './locales/en.json';
import vi from './locales/vi.json';

export type TranslationPersona = 'child' | 'parent';
export type TranslationEntry = string | Readonly<Record<TranslationPersona, string>>;
export type TranslationMetadataLeaf = string | number | boolean | null;
export type TranslationMetadataValue = TranslationMetadataLeaf | Readonly<Record<string, TranslationMetadataLeaf>>;
export type TranslationResourceValue = TranslationEntry | Readonly<Record<string, TranslationMetadataValue>>;
export type TranslationDictionary = Readonly<Record<string, TranslationResourceValue>>;

export const resources = {
  en: { translation: en as TranslationDictionary },
  vi: { translation: vi as TranslationDictionary },
} as const;

export type Locale = keyof typeof resources;
