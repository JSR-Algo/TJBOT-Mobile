#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMobileEnv } from './mobile-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const iosRoot = path.join(repoRoot, 'ios');

const DEFAULTS = {
  simulatorName: 'iPhone 17',
  bundleId: 'net.jasonle.tjbot',
  screenshot: 'artifacts/ios-runtime/tjbot-ios-release-launch.png',
  summary: 'artifacts/ios-runtime/ios-release-proof-summary.json',
};

function printHelp() {
  console.log(`iOS Release proof runner

Runs the reusable TeeBot iOS readiness path:
  1. npm run i18n:check
  2. npm run typecheck
  3. npm run lint
  4. npm run check:route-coverage
  5. npm test -- --runInBand --forceExit --json --outputFile=artifacts/jest-unit-results.current.json
  6. xcodebuild Release for an iOS simulator
  7. install and launch the Release .app with Metro stopped
  8. capture a simulator screenshot and JSON summary

Usage:
  npm run release:ios:proof
  npm run release:ios:proof -- --simulator-name "iPhone 17"
  npm run release:ios:proof -- --simulator-id <UDID>
  npm run release:ios:proof -- --dry-run

Options:
  --simulator-name <name>  Simulator name for xcodebuild and simctl. Default: ${DEFAULTS.simulatorName}
  --simulator-id <UDID>    Exact simulator UDID. If omitted, resolves by simulator name.
  --bundle-id <id>         App bundle identifier to launch. Default: ${DEFAULTS.bundleId}
  --screenshot <path>      Screenshot artifact path. Default: ${DEFAULTS.screenshot}
  --summary <path>         JSON summary artifact path. Default: ${DEFAULTS.summary}
  --dry-run                Print commands without running them.
  --help                   Show this help.
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--simulator-name') {
      options.simulatorName = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--simulator-id') {
      options.simulatorId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--bundle-id') {
      options.bundleId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--screenshot') {
      options.screenshot = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--summary') {
      options.summary = requireValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function runStep(name, bin, args, options) {
  const commandLine = [bin, ...args].join(' ');
  console.log(`\n==> ${name}`);
  console.log(commandLine);
  if (options.dryRun) return { name, commandLine, status: 'dry-run' };

  const result = spawnSync(bin, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    throw new Error(`${name} failed to start: ${result.error.message}`);
  }
  if ((result.status ?? 1) !== 0) {
    if (options.allowFailure) {
      return { name, commandLine, status: result.status ?? 1 };
    }
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${name} exited ${result.status ?? 1}`);
  }

  return {
    name,
    commandLine,
    status: result.status ?? 0,
    stdout: options.capture ? result.stdout : undefined,
  };
}

function resolveSimulatorId(options, env) {
  if (options.simulatorId) return options.simulatorId;
  if (options.dryRun) return '<resolved-simulator-udid>';

  const result = runStep('Resolve simulator', 'xcrun', ['simctl', 'list', 'devices', '--json'], {
    cwd: repoRoot,
    env,
    capture: true,
  });
  const payload = JSON.parse(result.stdout);
  const devices = Object.values(payload.devices ?? {}).flat();
  const matching = devices.filter((device) => device.name === options.simulatorName && device.isAvailable !== false);
  const selected = matching.find((device) => device.state === 'Booted') ?? matching[0];
  if (!selected?.udid) {
    throw new Error(`No available simulator named "${options.simulatorName}"`);
  }
  return selected.udid;
}

function readBuildSetting(key, env, options) {
  if (options.dryRun) return key === 'TARGET_BUILD_DIR' ? '<target-build-dir>' : 'TJBOT.app';

  const result = runStep(
    `Read Xcode build setting ${key}`,
    'xcodebuild',
    [
      '-workspace',
      'TJBotMobile.xcworkspace',
      '-scheme',
      'TJBotMobile',
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      `platform=iOS Simulator,name=${options.simulatorName}`,
      '-showBuildSettings',
    ],
    { cwd: iosRoot, env, capture: true },
  );
  const line = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${key} = `));
  if (!line) throw new Error(`xcodebuild did not report ${key}`);
  return line.slice(`${key} = `.length).trim();
}

function absoluteArtifact(relativeOrAbsolute) {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(repoRoot, relativeOrAbsolute);
}

function writeSummary(summaryPath, summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const env = createMobileEnv();
  const screenshotPath = absoluteArtifact(options.screenshot);
  const summaryPath = absoluteArtifact(options.summary);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const steps = [];
  const run = (name, bin, args, stepOptions = {}) => {
    const result = runStep(name, bin, args, { cwd: repoRoot, env, ...options, ...stepOptions });
    steps.push({ name: result.name, commandLine: result.commandLine, status: result.status });
    return result;
  };

  run('i18n check', 'npm', ['run', 'i18n:check']);
  run('TypeScript typecheck', 'npm', ['run', 'typecheck']);
  run('ESLint', 'npm', ['run', 'lint']);
  run('Route coverage', 'npm', ['run', 'check:route-coverage']);
  run('Unit tests', 'npm', [
    'test',
    '--',
    '--runInBand',
    '--forceExit',
    '--json',
    '--outputFile=artifacts/jest-unit-results.current.json',
  ]);

  run('Release simulator build', 'xcodebuild', [
    '-workspace',
    'TJBotMobile.xcworkspace',
    '-scheme',
    'TJBotMobile',
    '-configuration',
    'Release',
    '-sdk',
    'iphonesimulator',
    '-destination',
    `platform=iOS Simulator,name=${options.simulatorName}`,
    'build',
  ], { cwd: iosRoot });

  const simulatorId = resolveSimulatorId(options, env);
  const targetBuildDir = readBuildSetting('TARGET_BUILD_DIR', env, options);
  const fullProductName = readBuildSetting('FULL_PRODUCT_NAME', env, options);
  const appPath = path.join(targetBuildDir, fullProductName);
  if (!options.dryRun && !fs.existsSync(appPath)) {
    throw new Error(`Release app not found: ${appPath}`);
  }

  run('Simulator boot status', 'xcrun', ['simctl', 'bootstatus', simulatorId, '-b']);
  run('Terminate existing app', 'xcrun', ['simctl', 'terminate', simulatorId, options.bundleId], { allowFailure: true });
  run('Install Release app', 'xcrun', ['simctl', 'install', simulatorId, appPath]);
  run('Launch Release app', 'xcrun', ['simctl', 'launch', simulatorId, options.bundleId]);
  run('Wait for first frame', process.platform === 'win32' ? 'timeout' : 'sleep', ['8']);
  run('Capture screenshot', 'xcrun', ['simctl', 'io', simulatorId, 'screenshot', screenshotPath]);

  const summary = {
    createdAt: new Date().toISOString(),
    repoRoot,
    simulatorName: options.simulatorName,
    simulatorId,
    bundleId: options.bundleId,
    appPath,
    screenshotPath,
    metroRequired: false,
    releaseBuild: true,
    steps,
  };
  if (!options.dryRun) writeSummary(summaryPath, summary);

  console.log('\nRelease proof complete.');
  console.log(`Screenshot: ${screenshotPath}`);
  console.log(`Summary: ${summaryPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
