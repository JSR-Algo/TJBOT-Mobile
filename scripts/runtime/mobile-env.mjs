import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function isDirectory(value) {
  return Boolean(value) && fs.existsSync(value) && fs.statSync(value).isDirectory();
}

function isFile(value) {
  return Boolean(value) && fs.existsSync(value) && fs.statSync(value).isFile();
}

function prependPath(env, entries) {
  const delimiter = path.delimiter;
  const current = String(env.PATH || '').split(delimiter).filter(Boolean);
  const next = [];
  for (const entry of entries) {
    if (isDirectory(entry) && !next.includes(entry)) next.push(entry);
  }
  for (const entry of current) {
    if (!next.includes(entry)) next.push(entry);
  }
  env.PATH = next.join(delimiter);
}

export function resolveAndroidSdk(env = process.env) {
  const home = env.HOME || '';
  const candidates = [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    home && path.join(home, 'Library/Android/sdk'),
  ];
  return candidates.find(isDirectory) || '';
}

function androidStudioJbrCandidates() {
  const applicationsDir = '/Applications';
  if (!isDirectory(applicationsDir)) return [];
  return fs
    .readdirSync(applicationsDir)
    .filter((name) => name.startsWith('Android Studio') && name.endsWith('.app'))
    .map((name) => path.join(applicationsDir, name, 'Contents/jbr/Contents/Home'));
}

export function resolveJavaHome(env = process.env) {
  if (isFile(path.join(env.JAVA_HOME || '', 'bin/java'))) return env.JAVA_HOME;

  try {
    const systemJavaHome = execFileSync('/usr/libexec/java_home', [], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (isFile(path.join(systemJavaHome, 'bin/java'))) return systemJavaHome;
  } catch {
    // Fall back to Android Studio's bundled JBR below.
  }

  return androidStudioJbrCandidates().find((candidate) => isFile(path.join(candidate, 'bin/java'))) || '';
}

export function createMobileEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  const androidSdk = resolveAndroidSdk(env);
  const javaHome = resolveJavaHome(env);

  if (!env.NODE_ENV) env.NODE_ENV = 'development';

  if (androidSdk) {
    env.ANDROID_HOME = androidSdk;
    env.ANDROID_SDK_ROOT = androidSdk;
  }

  if (javaHome) {
    env.JAVA_HOME = javaHome;
  }

  prependPath(env, [
    javaHome && path.join(javaHome, 'bin'),
    androidSdk && path.join(androidSdk, 'platform-tools'),
    androidSdk && path.join(androidSdk, 'emulator'),
    androidSdk && path.join(androidSdk, 'cmdline-tools/latest/bin'),
  ]);

  return env;
}

export function createDetoxEnv(platform, baseEnv = process.env) {
  const env = createMobileEnv(baseEnv);
  env.E2E_LOCAL_API_URL ||= 'http://127.0.0.1:3300';
  env.E2E_LOCAL_AI_URL ||= 'http://127.0.0.1:3301/api/ai';

  if (platform === 'android') {
    env.E2E_ANDROID_API_URL ||= 'http://10.0.2.2:3300';
    env.E2E_ANDROID_AI_URL ||= 'http://10.0.2.2:3301/api/ai';
  } else if (platform === 'ios') {
    env.E2E_IOS_API_URL ||= 'http://127.0.0.1:3300';
    env.E2E_IOS_AI_URL ||= 'http://127.0.0.1:3301/api/ai';
  } else {
    throw new Error(`Unsupported Detox platform: ${platform}`);
  }

  return env;
}

export function runtimeSummary(env = createMobileEnv()) {
  return {
    NODE_ENV: env.NODE_ENV || '',
    JAVA_HOME: env.JAVA_HOME || '',
    ANDROID_HOME: env.ANDROID_HOME || '',
    ANDROID_SDK_ROOT: env.ANDROID_SDK_ROOT || '',
    PATH_HEAD: String(env.PATH || '').split(path.delimiter).slice(0, 6),
  };
}
