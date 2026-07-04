import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { DevSettings, NativeModules, Platform } from 'react-native';
import { getApiBaseUrl } from '../config';

const STORE_KEY = 'tjbot_metro_bundler_session_v1';

function isStaleBundlerSession(session: MetroBundlerSession): boolean {
  if (session.bundler_scheme === 'https') return true;
  if (session.bundler_host.includes('trycloudflare.com')) return true;
  return false;
}

export type MetroBundlerSession = {
  public_ip: string;
  bundler_host: string;
  bundler_scheme: 'http' | 'https';
  tunnel_url: string;
  updated_at: string;
};

type MetroBundlerNativeModule = {
  applySession: (
    host: string,
    scheme: string,
    publicIp: string,
  ) => Promise<boolean>;
};

function getNativeModule(): MetroBundlerNativeModule | null {
  const mod = NativeModules.MetroBundlerSession as MetroBundlerNativeModule | undefined;
  return mod?.applySession ? mod : null;
}

export function shouldReplaceSession(
  cached: MetroBundlerSession | null,
  remote: MetroBundlerSession,
): boolean {
  if (!cached) return true;
  if (cached.updated_at !== remote.updated_at) return true;
  if (cached.public_ip !== remote.public_ip) return true;
  if (cached.bundler_host !== remote.bundler_host) return true;
  return false;
}

export async function readCachedMetroBundlerSession(): Promise<MetroBundlerSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MetroBundlerSession;
  } catch {
    return null;
  }
}

async function writeCachedMetroBundlerSession(session: MetroBundlerSession): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(session));
}

async function fetchRemoteMetroBundlerSession(): Promise<MetroBundlerSession | null> {
  const registryRoot = getApiBaseUrl().replace(/\/v1$/, '/v1');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${registryRoot}/dev/metro-session`, { signal: controller.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { session?: MetroBundlerSession | null };
    return body.session ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function applyNativeSession(session: MetroBundlerSession): Promise<void> {
  const native = getNativeModule();
  if (!native) return;
  await native.applySession(session.bundler_host, session.bundler_scheme, session.public_ip);
}

export async function syncMetroBundlerSession(opts?: {
  reloadOnChange?: boolean;
}): Promise<MetroBundlerSession | null> {
  if (!__DEV__ || !Device.isDevice || Platform.OS !== 'ios') return null;

  let cached = await readCachedMetroBundlerSession();
  if (cached && isStaleBundlerSession(cached)) {
    await SecureStore.deleteItemAsync(STORE_KEY);
    cached = null;
  }
  if (cached) {
    await applyNativeSession(cached);
  }

  const remote = await fetchRemoteMetroBundlerSession();
  if (!remote) return cached;

  if (!shouldReplaceSession(cached, remote)) {
    return cached;
  }

  await writeCachedMetroBundlerSession(remote);
  await applyNativeSession(remote);

  if (opts?.reloadOnChange) {
    DevSettings.reload();
  }

  return remote;
}