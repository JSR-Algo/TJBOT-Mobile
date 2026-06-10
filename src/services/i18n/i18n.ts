import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as AppStorage from '@/services/storage/asyncStorage';
import { captureError } from '@/services/observability/sentry';
import { resources, type Locale, type TranslationPersona, type TranslationResourceValue } from './resources';

export type { TranslationPersona } from './resources';

export const DEFAULT_APP_LOCALE: Locale = 'vi';
export const APP_LANGUAGE_STORAGE_KEY = 'tjbot.app.language';
export const SUPPORTED_APP_LOCALES = ['vi', 'en'] as const satisfies readonly Locale[];

export type AppLocale = typeof SUPPORTED_APP_LOCALES[number];

type TranslateCopyOptions = {
  locale?: AppLocale;
  persona?: TranslationPersona;
};

type TemplateValue = string | number;
type TranslateTemplateValues = Readonly<Record<string, TemplateValue>>;

const SUPPORTED_APP_LOCALE_SET: ReadonlySet<string> = new Set<string>(SUPPORTED_APP_LOCALES);

i18next.use(initReactI18next).init({
  resources,
  lng: DEFAULT_APP_LOCALE,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_APP_LOCALE_SET.has(value);
}

export function getCurrentAppLanguage(): AppLocale {
  const currentLanguage = i18next.resolvedLanguage ?? i18next.language;
  return isAppLocale(currentLanguage) ? currentLanguage : DEFAULT_APP_LOCALE;
}

export async function loadAppLanguagePreference(): Promise<AppLocale> {
  const storedLanguage = await AppStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  const locale = isAppLocale(storedLanguage) ? storedLanguage : DEFAULT_APP_LOCALE;
  if (storedLanguage !== null && storedLanguage !== locale) {
    await AppStorage.setItem(APP_LANGUAGE_STORAGE_KEY, locale);
  }
  await i18next.changeLanguage(locale);
  return locale;
}

export async function setAppLanguage(locale: AppLocale): Promise<AppLocale> {
  await AppStorage.setItem(APP_LANGUAGE_STORAGE_KEY, locale);
  await i18next.changeLanguage(locale);
  return locale;
}

function resolveEntry(entry: TranslationResourceValue | undefined, persona: TranslationPersona): string | null {
  if (entry === undefined) return null;
  if (typeof entry === 'string') return entry;
  if ('child' in entry && 'parent' in entry && typeof entry.child === 'string' && typeof entry.parent === 'string') {
    return persona === 'child' ? entry.child : entry.parent;
  }
  return null;
}

export function translateCopy(copy: string, options?: TranslateCopyOptions): string {
  const locale = options?.locale ?? getCurrentAppLanguage();
  const persona = options?.persona ?? 'parent';
  const entry = resources[locale].translation[copy];
  const translated = resolveEntry(entry, persona);
  return translated ?? copy;
}

export function translateTemplate(
  copy: string,
  values: TranslateTemplateValues,
  options?: TranslateCopyOptions,
): string {
  const template = translateCopy(copy, options);
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
}

export function localeDateTag(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function translateStringSegment(copy: string, options?: TranslateCopyOptions): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(copy);
  if (!match) return copy;
  const [, prefix, core, suffix] = match;
  if (!core) return copy;
  const translated = translateCopy(core, options);
  return translated === core ? copy : `${prefix}${translated}${suffix}`;
}

export function translateReactNode(node: ReactNode, options?: TranslateCopyOptions): ReactNode {
  if (typeof node === 'string') return translateStringSegment(node, options);
  if (Array.isArray(node)) return node.map(child => translateReactNode(child, options));
  return node;
}

function subscribeLanguageChange(listener: () => void): () => void {
  const wrapped = (): void => listener();
  i18next.on('languageChanged', wrapped);
  return () => {
    i18next.off('languageChanged', wrapped);
  };
}

export function useAppLanguage(): {
  language: AppLocale;
  setLanguage: (locale: AppLocale) => Promise<AppLocale>;
  t: (copy: string, options?: Omit<TranslateCopyOptions, 'locale'>) => string;
} {
  const language = useSyncExternalStore(
    subscribeLanguageChange,
    getCurrentAppLanguage,
    getCurrentAppLanguage,
  );
  const setLanguage = useCallback((locale: AppLocale) => setAppLanguage(locale), []);
  const t = useCallback(
    (copy: string, options?: Omit<TranslateCopyOptions, 'locale'>) => translateCopy(copy, { ...options, locale: language }),
    [language],
  );
  return { language, setLanguage, t };
}

export function useLoadAppLanguagePreference(): void {
  useEffect(() => {
    let active = true;
    loadAppLanguagePreference().catch(error => {
      captureError(error);
      if (active) {
        i18next.changeLanguage(DEFAULT_APP_LOCALE).catch(captureError);
      }
    });
    return () => {
      active = false;
    };
  }, []);
}

export default i18next;
