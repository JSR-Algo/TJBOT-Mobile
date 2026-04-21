/**
 * Async factory for the integration-test mock HTTP backend.
 *
 * Implements enough of the TBOT backend surface to let the auth-isolation
 * suite run deterministically without a live service. Not a contract
 * replacement.
 *
 * Callers: `global-setup.ts` (awaits `startMockBackend` once per test run).
 */
import http, { IncomingMessage, ServerResponse, Server } from 'http';
import { AddressInfo } from 'net';

type Json = Record<string, unknown>;

function send(res: ServerResponse, status: number, body: Json): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Json;
  } catch {
    return {};
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function authToken(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice('Bearer '.length);
}

function buildHandler() {
  const users = new Map<string, { password: string; token: string; id: string; name: string }>();
  const households = new Map<string, { id: string; ownerToken: string; name: string }>();
  const children = new Map<string, { id: string; householdId: string; name: string }>();

  return function handler(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '';
    const method = req.method ?? 'GET';

    (async () => {
      if (method === 'POST' && url === '/v1/auth/signup') {
        const body = await readBody(req);
        const email = String(body.email ?? '');
        const password = String(body.password ?? '');
        const name = String(body.name ?? '');
        if (!email || !password) return send(res, 400, { error: { code: 'VALIDATION_ERROR' } });
        if (users.has(email)) return send(res, 409, { error: { code: 'USER_EXISTS' } });
        const token = uid('tok');
        users.set(email, { password, token, id: uid('usr'), name });
        return send(res, 201, { data: { access_token: token, refresh_token: uid('ref'), user: { email, name } } });
      }
      if (method === 'POST' && url === '/v1/auth/login') {
        const body = await readBody(req);
        const u = users.get(String(body.email ?? ''));
        if (!u || u.password !== body.password) return send(res, 401, { error: { code: 'INVALID_CREDENTIALS' } });
        return send(res, 200, { data: { access_token: u.token, refresh_token: uid('ref') } });
      }
      if (method === 'POST' && url === '/v1/auth/consent') {
        return send(res, 200, { data: { coppa_verified: true } });
      }
      if (method === 'POST' && url === '/v1/auth/refresh') {
        return send(res, 200, { data: { access_token: uid('tok'), refresh_token: uid('ref') } });
      }

      if (method === 'POST' && url === '/v1/households') {
        const tok = authToken(req);
        if (!tok) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const body = await readBody(req);
        const id = uid('hh');
        households.set(id, { id, ownerToken: tok, name: String(body.name ?? '') });
        return send(res, 201, { data: { id, name: body.name } });
      }
      const childMatch = /^\/v1\/households\/([^/]+)\/children$/.exec(url);
      if (method === 'POST' && childMatch) {
        const tok = authToken(req);
        if (!tok) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const hh = households.get(childMatch[1]);
        if (!hh) return send(res, 404, { error: { code: 'HOUSEHOLD_NOT_FOUND' } });
        if (hh.ownerToken !== tok) return send(res, 403, { error: { code: 'FORBIDDEN' } });
        const body = await readBody(req);
        const id = uid('ch');
        children.set(id, { id, householdId: hh.id, name: String(body.name ?? '') });
        return send(res, 201, { data: { id, name: body.name } });
      }

      const profileMatch = /^\/v1\/learning\/children\/([^/]+)\/profile$/.exec(url);
      if (method === 'GET' && profileMatch) {
        const tok = authToken(req);
        if (!tok) return send(res, 401, { error: { code: 'UNAUTHORIZED' } });
        const child = children.get(profileMatch[1]);
        if (!child) return send(res, 404, { error: { code: 'CHILD_NOT_FOUND' } });
        const hh = households.get(child.householdId);
        if (!hh || hh.ownerToken !== tok) return send(res, 403, { error: { code: 'FORBIDDEN' } });
        return send(res, 200, { data: { vocabulary_level: 'beginner', speaking_confidence: 0.5 } });
      }

      return send(res, 404, { error: { code: 'NOT_FOUND' } });
    })().catch(() => send(res, 500, { error: { code: 'INTERNAL_ERROR' } }));
  };
}

export async function startMockBackend(): Promise<{ url: string; server: Server }> {
  const server = http.createServer(buildHandler());
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${addr.port}/v1`, server };
}
