import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LOCALE,
  loadAppLanguagePreference,
  setAppLanguage,
  translateCopy,
  translateTemplate,
} from '../../src/services/i18n/i18n';
import { FSM_TIMER_TABLE } from '../../src/state/voiceAssistantStore';

describe('app language preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('defaults the app UI to Vietnamese when no preference is persisted', async () => {
    const locale = await loadAppLanguagePreference();

    expect(DEFAULT_APP_LOCALE).toBe('vi');
    expect(locale).toBe('vi');
    expect(i18n.language).toBe('vi');
    expect(translateCopy('Settings')).toBe('Cài đặt');
  });

  it('persists English and translates representative copy in English', async () => {
    await setAppLanguage('en');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(APP_LANGUAGE_STORAGE_KEY, 'en');
    expect(i18n.language).toBe('en');
    expect(translateCopy('App language')).toBe('App language');
  });

  it('loads a persisted English preference on startup', async () => {
    await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, 'en');

    const locale = await loadAppLanguagePreference();

    expect(locale).toBe('en');
    expect(i18n.language).toBe('en');
  });

  it('falls back to Vietnamese for unsupported persisted values', async () => {
    await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, 'fr');

    const locale = await loadAppLanguagePreference();

    expect(locale).toBe('vi');
    expect(i18n.language).toBe('vi');
  });

  it('translates formatted copy without falling back to English templates', () => {
    expect(
      translateTemplate(
        'This week: {{lessons}} {{lessonLabel}} and {{minutes}} {{minuteLabel}}.',
        { lessons: 2, lessonLabel: 'bài', minutes: 5, minuteLabel: 'phút' },
        { locale: 'vi' },
      ),
    ).toBe('Tuần này: 2 bài và 5 phút.');
  });

  it('translates every user-facing voice timeout instead of exposing English in Vietnamese mode', () => {
    const messages = Object.values(FSM_TIMER_TABLE)
      .map(config => config?.errorMessage)
      .filter((message): message is string => Boolean(message));

    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(translateCopy(message, { locale: 'en' })).toBe(message);
      expect(translateCopy(message, { locale: 'vi' })).not.toBe(message);
    }
  });

  it('translates the simulator fallback in both directions', () => {
    const fallback = 'The simulator cannot use live microphone audio reliably. Text test mode is active so you can still check the Gemini screen.';

    expect(translateCopy(fallback, { locale: 'en' })).toBe(fallback);
    expect(translateCopy(fallback, { locale: 'vi' })).toContain('Chế độ kiểm tra văn bản');
  });
});
