import { createServer } from 'http';
import * as http from 'http';

import {
  assertLocalBackendReady,
  assertLocalAiSimulationReady,
  seedOnboardedAccount,
  stopLocalMockBackend,
  stopLocalMockAi,
} from '../../e2e/helpers/localServices';

async function unusedLocalPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  if (!address || typeof address === 'string') {
    throw new Error('Expected an ephemeral local port');
  }
  return address.port;
}

describe('Detox local services', () => {
  const originalApiUrl = process.env.E2E_LOCAL_API_URL;
  const originalAiUrl = process.env.E2E_LOCAL_AI_URL;

  afterEach(async () => {
    await stopLocalMockBackend();
    await stopLocalMockAi();
    if (originalApiUrl === undefined) {
      delete process.env.E2E_LOCAL_API_URL;
    } else {
      process.env.E2E_LOCAL_API_URL = originalApiUrl;
    }
    if (originalAiUrl === undefined) {
      delete process.env.E2E_LOCAL_AI_URL;
    } else {
      process.env.E2E_LOCAL_AI_URL = originalAiUrl;
    }
  });

  it('starts a simulation-mode AI mock when the local AI service is absent', async () => {
    const port = await unusedLocalPort();
    process.env.E2E_LOCAL_AI_URL = `http://127.0.0.1:${port}/api/ai`;

    await expect(assertLocalAiSimulationReady()).resolves.toBeUndefined();
  });

  it('seeds an onboarded auth account and rejects duplicate signup', async () => {
    const port = await unusedLocalPort();
    process.env.E2E_LOCAL_API_URL = `http://127.0.0.1:${port}`;
    await assertLocalBackendReady();

    await seedOnboardedAccount('parent@example.test', 'Pass123@');

    const duplicate = await postJson(`http://127.0.0.1:${port}/v1/auth/signup`, {
      email: 'parent@example.test',
      password: 'Pass123@',
      name: 'Duplicate Parent',
    });

    expect(duplicate.status).toBe(409);
    expect(field(field(duplicate.body, 'error'), 'code')).toBe('USER_EXISTS');
  });
});

type JsonResponse = {
  status: number;
  body: unknown;
};

function postJson(url: string, body: Record<string, unknown>): Promise<JsonResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      method: 'POST',
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let payload = '';
      res.on('data', chunk => { payload += String(chunk); });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: payload ? JSON.parse(payload) as unknown : null });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return Reflect.get(value, key);
}
