import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  { ignores: ['node_modules', 'android', 'ios', '.omc'] },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/features/*/*'], message: 'Cross-feature imports forbidden — use @/design-system or @/components' }
        ]
      }],
      'no-undef': 'off',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
    }
  }
];
