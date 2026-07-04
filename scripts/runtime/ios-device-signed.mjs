#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMobileEnv } from './mobile-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const iosRoot = path.join(repoRoot, 'ios');

const DEFAULTS = {
  deviceId: process.env.TBOT_IOS_DEVICE_ID || '00008130-0019745E02F0001C',
  teamId: process.env.TBOT_IOS_DEVELOPMENT_TEAM || 'EG7TK62A7Q',
  bundleId: process.env.TBOT_IOS_BUNDLE_ID || 'net.jasonle.tjbot',
  configuration: process.env.TBOT_IOS_CONFIGURATION || 'Debug',
  summary: 'artifacts/ios-runtime/ios-device-sign-summary.json',
};

function printHelp() {
  console.log(`iOS physical-device signing runner

Builds, signs, installs, and optionally launches TJBot on a connected iPad/iPhone
without writing DEVELOPMENT_TEAM into the shared Xcode project.

Usage:
  npm run ios:device:signed
  npm run ios:device:signed -- --device-id 00008130-0019745E02F0001C
  npm run ios:device:signed -- --team-id EG7TK62A7Q
  npm run ios:device:signed -- --no-launch
  npm run ios:device:signed -- --dry-run

Options:
  --device-id <UDID>       Physical device UDID. Default: ${DEFAULTS.deviceId}
  --team-id <TEAM_ID>      Apple development team. Default: ${DEFAULTS.teamId}
  --bundle-id <id>         App bundle identifier. Default: ${DEFAULTS.bundleId}
  --configuration <name>   Xcode configuration. Default: ${DEFAULTS.configuration}
  --summary <path>         JSON summary artifact. Default: ${DEFAULTS.summary}
  --no-launch              Build and install only; skip remote launch.
  --strict-launch          Treat launch failure as command failure.
  --dry-run                Print commands without running them.
  --help                   Show this help.

Notes:
  Debug physical-device builds need Metro, usually:
    npm run start -- --port 8081
  If install succeeds but launch reports the device is locked, unlock the iPad,
  keep it on the home screen, and tap TJBOT manually or rerun with --strict-launch.
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS, launch: true, strictLaunch: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-launch') {
      options.launch = false;
    } else if (arg === '--strict-launch') {
      options.strictLaunch = true;
    } else if (arg === '--device-id') {
      options.deviceId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--team-id') {
      options.teamId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--bundle-id') {
      options.bundleId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--configuration') {
      options.configuration = requireValue(argv, index, arg);
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
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function commandLine(bin, args) {
  return [bin, ...args].join(' ');
}

function runStep(name, bin, args, options) {
  const line = commandLine(bin, args);
  console.log(`\n==> ${name}`);
  console.log(line);
  if (options.dryRun) return { name, commandLine: line, status: 'dry-run' };

  const result = spawnSync(bin, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  const status = result.status ?? 1;
  if (result.error) throw new Error(`${name} failed to start: ${result.error.message}`);
  if (status !== 0 && !options.allowFailure) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${name} exited ${status}`);
  }

  return {
    name,
    commandLine: line,
    status,
    stdout: options.capture ? result.stdout : undefined,
    stderr: options.capture ? result.stderr : undefined,
  };
}

const SAFE_XCODE_ENV_KEYS = [
  'EXPO_PUBLIC_TBOT_API_URL',
  'EXPO_PUBLIC_TBOT_AI_URL',
  'EXPO_PUBLIC_WS_URL',
  'EXPO_PUBLIC_VOICE_TEST_HARNESS',
  'EXPO_PUBLIC_FEATURE_ZERO_CODE_CLAIM',
  'EXPO_PUBLIC_VOICE_FORCE_NATIVE_IOS',
  'EXPO_PUBLIC_INVESTOR_DEMO',
];

function safeXcodeEnvArgs(env) {
  return SAFE_XCODE_ENV_KEYS.flatMap((key) => {
    const value = env[key];
    return value === undefined ? [] : [`${key}=${value}`];
  });
}

function xcodeArgs(options, action, env = {}) {
  return [
    '-workspace',
    'TJBotMobile.xcworkspace',
    '-scheme',
    'TJBotMobile',
    '-configuration',
    options.configuration,
    '-sdk',
    'iphoneos',
    '-destination',
    `id=${options.deviceId}`,
    '-allowProvisioningUpdates',
    `DEVELOPMENT_TEAM=${options.teamId}`,
    'CODE_SIGN_STYLE=Automatic',
    ...safeXcodeEnvArgs(env),
    action,
  ];
}

function readBuildSetting(key, env, options) {
  if (options.dryRun) return key === 'TARGET_BUILD_DIR' ? '<target-build-dir>' : 'TJBOT.app';

  const result = runStep(`Read Xcode build setting ${key}`, 'xcodebuild', xcodeArgs(options, '-showBuildSettings', env), {
    cwd: iosRoot,
    env,
    capture: true,
  });
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

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(env, envPath) {
  if (!fs.existsSync(envPath)) return env;
  const next = { ...env };
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (next[key] !== undefined) continue;
    next[key] = unquoteEnvValue(rawValue);
  }
  return next;
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

  const env = loadEnvFile(createMobileEnv(), path.join(repoRoot, '.env'));
  const steps = [];
  const run = (name, bin, args, stepOptions = {}) => {
    const result = runStep(name, bin, args, { env, ...options, ...stepOptions });
    steps.push({
      name: result.name,
      commandLine: result.commandLine,
      status: result.status,
      stderr: result.stderr?.trim() || undefined,
    });
    return result;
  };

  run('Signed physical-device build', 'xcodebuild', xcodeArgs(options, 'build', env), { cwd: iosRoot });

  const targetBuildDir = readBuildSetting('TARGET_BUILD_DIR', env, options);
  const fullProductName = readBuildSetting('FULL_PRODUCT_NAME', env, options);
  const appPath = path.join(targetBuildDir, fullProductName);
  if (!options.dryRun && !fs.existsSync(appPath)) throw new Error(`Built app not found: ${appPath}`);

  run('Install signed app', 'xcrun', ['devicectl', 'device', 'install', 'app', '--device', options.deviceId, appPath]);

  let launchResult = null;
  if (options.launch) {
    launchResult = run(
      'Launch signed app',
      'xcrun',
      ['devicectl', 'device', 'process', 'launch', '--device', options.deviceId, '--terminate-existing', options.bundleId],
      { capture: true, allowFailure: !options.strictLaunch },
    );

    if (typeof launchResult.status === 'number' && launchResult.status !== 0 && !options.strictLaunch) {
      console.warn('\nInstall succeeded, but remote launch failed.');
      console.warn('Unlock the device, keep it on the home screen, and tap TJBOT manually.');
    }
  }

  const summaryPath = absoluteArtifact(options.summary);
  const summary = {
    createdAt: new Date().toISOString(),
    repoRoot,
    deviceId: options.deviceId,
    teamId: options.teamId,
    bundleId: options.bundleId,
    configuration: options.configuration,
    appPath,
    installed: true,
    launchAttempted: options.launch,
    launchStatus: launchResult?.status ?? null,
    steps,
  };
  if (!options.dryRun) writeSummary(summaryPath, summary);

  console.log('\nPhysical-device signing path complete.');
  console.log(`App: ${appPath}`);
  console.log(`Summary: ${summaryPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
