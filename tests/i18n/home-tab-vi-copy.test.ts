import { resources } from '../../src/services/i18n/resources';
import { MAIN_TAB_SCREENS } from '../../src/navigation/featureRegistry';
import { translateCopy } from '../../src/services/i18n/i18n';

const OFFLINE_LESSON_STATUS =
  'Lesson status stays offline until the Home contract is live';

describe('Home / tab Vietnamese copy regressions', () => {
  it('translates every main tab title in English and Vietnamese', () => {
    for (const screen of MAIN_TAB_SCREENS) {
      expect(Object.hasOwn(resources.en.translation, screen.title)).toBe(true);
      expect(Object.hasOwn(resources.vi.translation, screen.title)).toBe(true);
      const vi = translateCopy(screen.title, { locale: 'vi' });
      expect(vi.trim().length).toBeGreaterThan(0);
      // Tab labels must not fall back to English for known non-loan titles.
      if (screen.title === 'Library') {
        expect(vi).toBe('Thư viện');
      }
      if (screen.title === 'Home') {
        expect(vi).toBe('Trang chủ');
      }
    }
  });

  it('does not leave English offline in the unavailable Home lesson-status VI string', () => {
    expect(Object.hasOwn(resources.en.translation, OFFLINE_LESSON_STATUS)).toBe(true);
    expect(Object.hasOwn(resources.vi.translation, OFFLINE_LESSON_STATUS)).toBe(true);
    const vi = resources.vi.translation[OFFLINE_LESSON_STATUS];
    expect(typeof vi).toBe('string');
    expect(String(vi).toLowerCase()).not.toContain('offline');
    expect(String(vi)).toContain('ngoại tuyến');
  });
});
