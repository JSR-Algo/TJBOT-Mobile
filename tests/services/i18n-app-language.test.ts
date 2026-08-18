import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LOCALE,
  loadAppLanguagePreference,
  setAppLanguage,
  translateCopy,
  translateTemplate,
} from '../../src/services/i18n/i18n';

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

  it('translates the PIN-free course assignment confirmation in Vietnamese', async () => {
    await setAppLanguage('vi');

    expect(translateCopy('Add course to Robot')).toBe('Thêm khóa học vào Robot');
    expect(translateCopy('Ready to add this course?')).toBe('Sẵn sàng thêm khóa học này?');
    expect(translateCopy('Robot will prepare the first lesson for your child.')).toBe(
      'Robot sẽ chuẩn bị bài học đầu tiên cho bé.',
    );
    expect(translateCopy('Choose a course before adding it to Robot.')).toBe(
      'Chọn một khóa học trước khi thêm vào Robot.',
    );
    expect(translateCopy('Add a child to this account before adding a course to Robot.')).toBe(
      'Thêm bé vào tài khoản này trước khi thêm khóa học vào Robot.',
    );
    expect(translateCopy('No Robot yet — connect Robot before adding a course.')).toBe(
      'Chưa có Robot — hãy kết nối Robot trước khi thêm khóa học.',
    );
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
});
