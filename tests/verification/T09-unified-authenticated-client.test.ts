import * as fs from 'fs';
import * as path from 'path';
import * as SecureStore from 'expo-secure-store';
import * as httpClient from '@/services/http/client';
import * as idempotency from '@/services/http/idempotency';

const AUTH_CONTEXT_PATH = path.join(__dirname, '../../src/contexts/AuthContext.tsx');
const AI_MODULE_PATH = path.join(__dirname, '../../src/services/api/ai.ts');

/**
 * Minimal in-memory axios adapter that fails a configurable number of times
 * with a given status before returning 200.
 */
function makeFailingAdapter(failures: number, failStatus: number) {
  let calls = 0;
  return jest.fn(async (config: any) => {
    calls += 1;
    if (calls <= failures) {
      const error = new Error('Temporary Failure');
      (error as any).config = config;
      (error as any).response = {
        data: { error: 'temporary failure' },
        status: failStatus,
        statusText: 'Temporary Failure',
        headers: {},
        config,
      };
      throw error;
    }
    return {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  });
}

describe('T09: unified authenticated client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no leftover token from another test.
    SecureStore.deleteItemAsync('TJBot_access_token');
  });

  it('exports a createAuthenticatedClient factory', () => {
    expect(httpClient.createAuthenticatedClient).toBeDefined();
    expect(typeof httpClient.createAuthenticatedClient).toBe('function');
  });

  it('creates axios instances with configurable baseURL and timeout', () => {
    const client = httpClient.createAuthenticatedClient({
      baseURL: 'https://ai.example.test',
      timeout: 15000,
    });

    expect(client.defaults.baseURL).toBe('https://ai.example.test');
    expect(client.defaults.timeout).toBe(15000);
  });

  it('injects the stored access token as a Bearer header', async () => {
    await SecureStore.setItemAsync('TJBot_access_token', 'stored-access-token');

    const client = httpClient.createAuthenticatedClient({
      baseURL: 'https://rest.example.test',
    });
    const adapter = jest.fn(async (config: any) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    client.defaults.adapter = adapter;

    await client.get('/me');

    expect(adapter).toHaveBeenCalledTimes(1);
    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers.Authorization).toBe('Bearer stored-access-token');
  });

  it.each([
    [429, 'Too Many Requests'],
    [503, 'Service Unavailable'],
    [504, 'Gateway Timeout'],
  ])('retries %p responses on idempotent GETs until success', async (status) => {
    const client = httpClient.createAuthenticatedClient({
      baseURL: 'https://rest.example.test',
      timeout: 1000,
    });
    const adapter = makeFailingAdapter(2, status);
    client.defaults.adapter = adapter;

    const response = await client.get('/resource');

    expect(adapter).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);
  });

  it('uses newRequestId() from idempotency.js for mutating requests', async () => {
    const requestIdSpy = jest
      .spyOn(idempotency, 'newRequestId')
      .mockReturnValue('req-unified-123');

    const client = httpClient.createAuthenticatedClient({
      baseURL: 'https://rest.example.test',
    });
    const adapter = jest.fn(async (config: any) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    client.defaults.adapter = adapter;

    await client.post('/commit');

    expect(requestIdSpy).toHaveBeenCalled();
    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers['X-Request-Id']).toBe('req-unified-123');

    requestIdSpy.mockRestore();
  });

  it('does not import a separate AI auth-invalidated handler in AuthContext', () => {
    const source = fs.readFileSync(AUTH_CONTEXT_PATH, 'utf8');
    expect(source).not.toContain('setAiAuthInvalidatedHandler');
  });

  it('ships no AI chat module — the app has no chat surface', () => {
    expect(fs.existsSync(AI_MODULE_PATH)).toBe(false);
  });
});
