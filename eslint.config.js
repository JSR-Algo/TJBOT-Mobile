const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const jestPlugin = require('eslint-plugin-jest');

// P0-17 plan v2 §11.7 — TJBot custom rule banning FSM-affecting timers,
// RNLAS imports, and Platform.OS branches in shared voice layers.
const TJBotVoiceRule = require('./eslint-rules/no-voice-timing-in-shared.js');

module.exports = [
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jest': jestPlugin,
      'TJBot-voice': {
        rules: {
          'no-voice-timing-in-shared': TJBotVoiceRule,
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': ['error', { allow: ['error', 'warn', 'info'] }],
      'no-debugger': 'error',
      'TJBot-voice/no-voice-timing-in-shared': 'error',
    },
  },
  {
    files: ['tests/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'jest/no-disabled-tests': 'warn',
    },
  },
];
