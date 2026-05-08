const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

// P0-17 plan v2 §11.7 — TBOT custom rule banning FSM-affecting timers,
// RNLAS imports, and Platform.OS branches in shared voice layers.
const tbotVoiceRule = require('./eslint-rules/no-voice-timing-in-shared.js');

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
      'tbot-voice': {
        rules: {
          'no-voice-timing-in-shared': tbotVoiceRule,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'error',
      'no-debugger': 'error',
      'tbot-voice/no-voice-timing-in-shared': 'error',
    },
  },
];
