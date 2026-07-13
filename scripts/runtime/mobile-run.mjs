#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMobileEnv, runtimeSummary } from './mobile-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const [command, ...args] = process.argv.slice(2);
const env = createMobileEnv();

const commands = {
  android: {
    bin: 'npx',
    args: ['react-native', 'run-android', ...args],
    cwd: repoRoot,
  },
  start: {
    bin: 'npx',
    args: ['react-native', 'start', ...args],
    cwd: repoRoot,
  },
  'start-reset': {
    bin: 'npx',
    args: ['react-native', 'start', '--reset-cache', ...args],
    cwd: repoRoot,
  },
  ios: {
    bin: 'npx',
    args: ['react-native', 'run-ios', ...args],
    cwd: repoRoot,
  },
  'build-android': {
    steps: [
      {
        bin: 'npx',
        args: [
          'expo',
          'export:embed',
          '--entry-file',
          'index.js',
          '--platform',
          'android',
          '--dev',
          'true',
          '--minify',
          'false',
          '--reset-cache',
          '--bundle-output',
          'android/app/src/main/assets/index.android.bundle',
          '--assets-dest',
          'android/app/src/main/res',
        ],
        cwd: repoRoot,
      },
      {
        bin: './gradlew',
        args: ['assembleDebug', ...args],
        cwd: path.join(repoRoot, 'android'),
      },
    ],
  },
  'build-ios': {
    bin: 'xcodebuild',
    args: [
      '-workspace',
      'TJBotMobile.xcworkspace',
      '-scheme',
      'TJBotMobile',
      '-configuration',
      'Debug',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'generic/platform=iOS Simulator',
      'build',
      ...args,
    ],
    cwd: path.join(repoRoot, 'ios'),
  },
  pods: {
    bin: 'pod',
    args: ['install', ...args],
    cwd: path.join(repoRoot, 'ios'),
  },
  doctor: null,
};

if (!command || !(command in commands)) {
  console.error('Usage: node scripts/runtime/mobile-run.mjs <start|start-reset|android|ios|build-android|build-ios|pods|doctor> [args...]');
  process.exit(2);
}

if (command === 'doctor') {
  console.log(JSON.stringify(runtimeSummary(env), null, 2));
  process.exit(0);
}

const spec = commands[command];
const steps = spec.steps ?? [spec];

for (const step of steps) {
  const result = spawnSync(step.bin, step.args, {
    cwd: step.cwd,
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.exit(0);
