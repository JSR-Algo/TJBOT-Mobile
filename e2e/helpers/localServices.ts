import * as http from 'http';
import * as https from 'https';
import type { AddressInfo } from 'net';

type RequestHeaders = Record<string, string>;
type Json = Record<string, unknown>;

export type SeededAccount = {
  email: string;
  password: string;
};

const DEFAULT_API_ROOT = 'http://127.0.0.1:3000';
const DEFAULT_AI_ROOT = 'http://127.0.0.1:3001/api/ai';
let mockBackend: http.Server | null = null;
let mockAi: http.Server | null = null;

function e2eAuthMode(): string {
  return process.env.E2E_AUTH_MODE ?? 'preseed';
}

export function apiRoot(): string {
  return (process.env.E2E_LOCAL_API_URL ?? DEFAULT_API_ROOT).replace(/\/+$/, '');
}

export function apiV1Root(): string {
  const root = apiRoot();
  return root.endsWith('/v1') ? root : `${root}/v1`;
}

export function aiRoot(): string {
  return (process.env.E2E_LOCAL_AI_URL ?? DEFAULT_AI_ROOT).replace(/\/+$/, '');
}

export async function seedAccountWithoutHousehold(): Promise<SeededAccount> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `detox-module-${suffix}@test.tbot.io`;
  const password = 'Pass123@';

  if (e2eAuthMode() !== 'preseed') {
    return { email, password };
  }

  const signup = await requestJson('POST', `${apiV1Root()}/auth/signup`, {
    email,
    password,
    name: 'Detox Module Parent',
  });
  const signupStatus = getStatus(signup);
  if (signupStatus !== 201 && signupStatus !== 200) {
    throw new Error(`Expected local signup 2xx, got ${signupStatus}`);
  }

  const token = accessTokenFrom(signup);
  if (!token) {
    throw new Error('Local signup response missing access_token');
  }

  const consent = await requestJson('POST', `${apiV1Root()}/auth/consent`, {
    stripe_token: 'tok_test_bypass',
    consent_given: true,
  }, { Authorization: `Bearer ${token}` });
  const consentStatus = getStatus(consent);
  if (consentStatus < 200 || consentStatus >= 300) {
    throw new Error(`Expected local COPPA consent 2xx, got ${consentStatus}`);
  }

  return { email, password };
}

export async function seedOnboardedAccount(email: string, password: string): Promise<SeededAccount> {
  if (e2eAuthMode() !== 'preseed') {
    return { email, password };
  }

  let token: string | null = null;
  const signup = await requestJson('POST', `${apiV1Root()}/auth/signup`, {
    email,
    password,
    name: 'Detox Parent',
  });
  const signupStatus = getStatus(signup);
  if (signupStatus === 201 || signupStatus === 200) {
    token = accessTokenFrom(signup);
  } else if (signupStatus === 409) {
    const login = await requestJson('POST', `${apiV1Root()}/auth/login`, { email, password });
    const loginStatus = getStatus(login);
    if (loginStatus < 200 || loginStatus >= 300) {
      throw new Error(`Expected local login 2xx while seeding onboarded account, got ${loginStatus}`);
    }
    token = accessTokenFrom(login);
  } else {
    throw new Error(`Expected local signup 2xx/409, got ${signupStatus}`);
  }

  if (!token) {
    throw new Error('Local onboarded seed missing access_token');
  }

  const headers = { Authorization: `Bearer ${token}` };
  const consent = await requestJson('POST', `${apiV1Root()}/auth/consent`, {
    stripe_token: 'tok_test_bypass',
    consent_given: true,
  }, headers);
  const consentStatus = getStatus(consent);
  if (consentStatus < 200 || consentStatus >= 300) {
    throw new Error(`Expected local COPPA consent 2xx, got ${consentStatus}`);
  }

  const household = await requestJson('POST', `${apiV1Root()}/households`, {
    name: 'Detox Household',
  }, headers);
  const householdStatus = getStatus(household);
  if (householdStatus < 200 || householdStatus >= 300) {
    throw new Error(`Expected local household create 2xx, got ${householdStatus}`);
  }
  const householdId = stringField(getField(household, 'body'), 'id')
    || stringField(getField(getField(household, 'body'), 'data'), 'id');
  if (!householdId) {
    throw new Error('Local onboarded seed missing household id');
  }

  const child = await requestJson('POST', `${apiV1Root()}/households/${householdId}/children`, {
    name: 'Detox Child',
    // Backend requires a valid ISO-8601 date_of_birth and constrains
    // learning_style to visual | audio | interactive (see
    // src/services/api/households.ts + tbot-backend child DTO). The prior
    // fixture (no date_of_birth, learning_style: 'balanced') 400'd against the
    // real backend and aborted the whole auth suite in beforeAll.
    date_of_birth: '2019-05-01',
    vocabulary_level: 'beginner',
    learning_style: 'interactive',
  }, headers);
  const childStatus = getStatus(child);
  if (childStatus < 200 || childStatus >= 300) {
    throw new Error(`Expected local child create 2xx, got ${childStatus}`);
  }

  return { email, password };
}

export async function assertLocalBackendReady(): Promise<void> {
  let response: unknown;
  try {
    response = await requestJson('GET', `${apiV1Root()}/health`);
  } catch {
    await startMockBackend();
    response = await requestJson('GET', `${apiV1Root()}/health`);
  }
  const status = getStatus(response);
  if (status >= 500) {
    throw new Error(`Local backend health returned ${status}`);
  }
}

export async function stopLocalMockBackend(): Promise<void> {
  await stopMockServer('backend');
}

export async function stopLocalMockAi(): Promise<void> {
  await stopMockServer('ai');
}

async function stopMockServer(kind: 'backend' | 'ai'): Promise<void> {
  const server = kind === 'backend' ? mockBackend : mockAi;
  if (!server) return;
  if (kind === 'backend') mockBackend = null;
  else mockAi = null;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function assertLocalAiSimulationReady(): Promise<void> {
  let response: unknown;
  try {
    response = await requestJson('GET', `${aiServiceRoot()}/health`);
  } catch {
    await startMockAi();
    response = await requestJson('GET', `${aiServiceRoot()}/health`);
  }
  const status = getStatus(response);
  if (status >= 500) {
    throw new Error(`Local AI simulation returned ${status}`);
  }
  const body = getField(response, 'body');
  if (getField(body, 'simulation_mode') !== true) {
    throw new Error('Local AI service is not running with simulation_mode=true');
  }
}

async function startMockAi(): Promise<void> {
  if (mockAi) return;
  const root = new URL(aiServiceRoot());
  const port = Number(root.port || '80');
  const host = root.hostname === '127.0.0.1' || root.hostname === 'localhost' ? '0.0.0.0' : root.hostname;

  const server = http.createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    const method = req.method ?? 'GET';
    if (method === 'GET' && path === '/health') {
      send(res, 200, { status: 'ok', simulation_mode: true, service: 'tbot-mobile-e2e-ai-mock' });
      return;
    }
    send(res, 200, { simulation_mode: true, data: {} });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  if (address.port !== port) {
    server.close();
    throw new Error(`Mock AI started on unexpected port ${address.port}`);
  }
  mockAi = server;
}

async function requestJson(
  method: 'GET' | 'POST',
  url: string,
  body?: Record<string, unknown>,
  headers: RequestHeaders = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const parsed = new URL(url);
    const req = client.request({
      method,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }, (res) => {
      let payload = '';
      res.on('data', chunk => {
        payload += String(chunk);
      });
      res.on('end', () => {
        let parsedBody: unknown = payload;
        try {
          parsedBody = payload ? JSON.parse(payload) : null;
        } catch {
          parsedBody = payload;
        }
        resolve({ status: res.statusCode ?? 0, body: parsedBody });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out: ${method} ${url}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function getStatus(response: unknown): number {
  const status = getField(response, 'status');
  return typeof status === 'number' ? status : 0;
}

function accessTokenFrom(response: unknown): string | null {
  const body = getField(response, 'body');
  const data = getField(body, 'data') ?? body;
  const token = getField(data, 'access_token');
  return typeof token === 'string' ? token : null;
}

function aiServiceRoot(): string {
  return aiRoot().replace(/\/api\/ai$/, '');
}

function getField(value: unknown, key: string): unknown {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return undefined;
  }
  return Reflect.get(value, key);
}

async function readBody(req: http.IncomingMessage): Promise<Json> {
  return new Promise((resolve, reject) => {
    let payload = '';
    req.on('data', (chunk: Buffer | string) => {
      payload += String(chunk);
    });
    req.on('end', () => {
      if (!payload) {
        resolve({});
        return;
      }
      try {
        const parsed: unknown = JSON.parse(payload);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const body: Json = {};
          for (const [key, value] of Object.entries(parsed)) {
            body[key] = value;
          }
          resolve(body);
          return;
        }
        resolve({});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function startMockBackend(): Promise<void> {
  if (mockBackend) return;
  const root = new URL(apiRoot());
  const port = Number(root.port || '80');
  const host = root.hostname === '127.0.0.1' || root.hostname === 'localhost' ? '0.0.0.0' : root.hostname;
  const users = new Map<string, { id: string; email: string; name: string; password: string }>();
  const tokens = new Map<string, string>();
  const households = new Map<string, { id: string; name: string; ownerEmail: string }>();
  const children = new Map<string, { id: string; householdId: string; name: string }>();

  const server = http.createServer((req, res) => {
    void (async () => {
      const path = (req.url ?? '').split('?')[0] ?? '';
      const method = req.method ?? 'GET';
      const currentEmail = tokenEmail(req, tokens);

      if (method === 'GET' && path === '/v1/health') {
        return send(res, 200, { status: 'ok', service: 'tbot-mobile-e2e-mock' });
      }
      if (method === 'POST' && path === '/v1/auth/signup') {
        const body = await readBody(req);
        const email = stringField(body, 'email');
        const password = stringField(body, 'password');
        const name = stringField(body, 'name') || 'Detox Parent';
        if (!email || !password) return send(res, 400, { error: { code: 'VALIDATION_ERROR' } });
        if (users.has(email)) return send(res, 409, { error: { code: 'USER_EXISTS' } });
        const user = { id: uid('usr'), email, name, password };
        users.set(email, user);
        const accessToken = uid('tok');
        const refreshToken = uid('ref');
        tokens.set(accessToken, email);
        return send(res, 201, { data: { access_token: accessToken, refresh_token: refreshToken, user } });
      }
      if (method === 'POST' && path === '/v1/auth/forgot-password') {
        return send(res, 200, { data: { ok: true } });
      }
      if (method === 'POST' && path === '/v1/auth/login') {
        const body = await readBody(req);
        const email = stringField(body, 'email');
        const user = email ? users.get(email) : undefined;
        if (!user || user.password !== stringField(body, 'password')) {
          return send(res, 401, { error: { code: 'INVALID_CREDENTIALS' } });
        }
        const accessToken = uid('tok');
        const refreshToken = uid('ref');
        tokens.set(accessToken, email);
        return send(res, 200, { data: { access_token: accessToken, refresh_token: refreshToken, user } });
      }
      if (method === 'POST' && path === '/v1/auth/consent') {
        if (!currentEmail) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        return send(res, 200, { data: { coppa_verified: true } });
      }
      if (method === 'POST' && path === '/v1/auth/logout') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (method === 'GET' && path === '/v1/account/export') {
        if (!currentEmail) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const user = users.get(currentEmail);
        return send(res, 200, { data: { account: user } });
      }
      if (method === 'GET' && path === '/v1/households') {
        if (!currentEmail) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const data = Array.from(households.values())
          .filter((household) => household.ownerEmail === currentEmail)
          .map(({ id, name }) => ({ id, name }));
        return send(res, 200, { data });
      }
      if (method === 'POST' && path === '/v1/households') {
        if (!currentEmail) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const body = await readBody(req);
        const household = { id: uid('hh'), name: stringField(body, 'name') || 'Detox Household', ownerEmail: currentEmail };
        households.set(household.id, household);
        return send(res, 201, { data: household });
      }

      const childrenMatch = /^\/v1\/households\/([^/]+)\/children$/.exec(path);
      if (childrenMatch && method === 'GET') {
        const householdId = childrenMatch[1];
        return send(res, 200, {
          data: Array.from(children.values())
            .filter((child) => child.householdId === householdId)
            .map(({ id, name }) => ({ id, name, vocabulary_level: 'beginner', learning_style: 'interactive' })),
        });
      }
      if (childrenMatch && method === 'POST') {
        const householdId = childrenMatch[1];
        const household = households.get(householdId);
        if (!currentEmail || !household || household.ownerEmail !== currentEmail) {
          return send(res, 404, { error: { code: 'HOUSEHOLD_NOT_FOUND' } });
        }
        const body = await readBody(req);
        const child = { id: uid('ch'), householdId, name: stringField(body, 'name') || 'Detox Child' };
        children.set(child.id, child);
        return send(res, 201, { data: { ...child, vocabulary_level: 'beginner', learning_style: 'interactive' } });
      }

      if (method === 'POST' && path === '/v1/profile/active-child') {
        if (!currentEmail) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        return send(res, 200, { data: { ok: true } });
      }
      if (method === 'POST' && path === '/v1/notifications/push-token') {
        return send(res, 200, { data: { ok: true } });
      }

      return send(res, 200, { data: {} });
    })().catch((error: unknown) => {
      send(res, 500, { error: { code: 'MOCK_BACKEND_ERROR', message: error instanceof Error ? error.message : 'unknown' } });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  if (address.port !== port) {
    server.close();
    throw new Error(`Mock backend started on unexpected port ${address.port}`);
  }
  mockBackend = server;
}

function send(res: http.ServerResponse, status: number, body: Json): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function stringField(value: unknown, key: string): string {
  const field = getField(value, key);
  return typeof field === 'string' ? field : '';
}

function tokenEmail(req: http.IncomingMessage, tokens: Map<string, string>): string | null {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return null;
  return tokens.get(authorization.slice('Bearer '.length)) ?? null;
}
