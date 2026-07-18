module.exports = {
  displayName: 'rewards-live',
  preset: 'react-native',
  testEnvironment: 'node',
  rootDir: '../../..',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.ts'],
  testMatch: ['<rootDir>/tests/integration/rewards-live/rewards-live-rendered.test.tsx'],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'expo-secure-store': '<rootDir>/tests/__mocks__/expo-secure-store.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|expo-secure-store|expo)/)',
  ],
  maxWorkers: 1,
};
