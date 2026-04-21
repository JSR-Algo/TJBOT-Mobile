/**
 * Jest globalSetup for the integration project — starts the in-process mock
 * backend asynchronously so `setupFiles` (which runs sync and could race
 * `http.Server.listen`) no longer silently falls back to a real backend.
 *
 * Exposes the bound URL via TBOT_API_URL; worker processes spawned after
 * globalSetup inherit the env var.
 */
import { startMockBackend } from './mock-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any;

export default async function globalSetup(): Promise<void> {
  const { url, server } = await startMockBackend();
  process.env.TBOT_API_URL = url;
  globalThis.__MOCK_BACKEND_SERVER__ = server;
}
