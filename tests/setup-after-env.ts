import { cleanup } from '@testing-library/react-native';

type I18nModule = typeof import('../src/services/i18n/i18n');

beforeEach(async () => {
  const { default: i18n } = require('../src/services/i18n/i18n') as I18nModule;
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
