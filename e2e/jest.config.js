/**
 * Jest config for Detox E2E suite.
 *
 * Runs only e2e/*.test.ts files, using the Detox Jest circus runner.
 * Do NOT merge with the unit/integration Jest projects in package.json —
 * Detox needs its own runner + longer timeouts.
 */
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  transform: {
    '\\.tsx?$': ['babel-jest', { configFile: '<rootDir>/babel.config.js' }],
  },
};
