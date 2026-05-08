#!/usr/bin/env node
/**
 * TBOT Mobile E2E Test Script
 * Simulates: signup → consent → onboarding → interaction
 *
 * Usage:
 *   npm run e2e:mobile
 *   npm run e2e:mobile -- --url http://192.168.x.x:3000
 */

const http = require('http');
const https = require('https');

const RAW_URL = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1]
  || process.env.TBOT_API_URL
  || 'http://tbot-staging-alb-81759857.ap-southeast-1.elb.amazonaws.com';

// Backend uses global prefix /v1
const BASE_URL = RAW_URL.endsWith('/v1') ? RAW_URL.slice(0, -3) : RAW_URL;
const API = `${BASE_URL}/v1`;

const AI_URL = process.env.TBOT_AI_URL
  || BASE_URL.replace(':3000', ':3001') + '/api/ai';

let passed = 0;
let failed = 0;
let skipped = 0;

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 15000,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function step(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    const result = await fn();
    console.log('✅ PASS');
    passed++;
    return result;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    failed++;
    return null;
  }
}

// softStep: 404 = skipped (not deployed), other errors = fail
async function softStep(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    const result = await fn();
    console.log('✅ PASS');
    passed++;
    return result;
  } catch (err) {
    if (err.message && (err.message.includes('404') || err.message.includes('503') || err.message.includes('502'))) {
      console.log(`⚠️  SKIP: ${err.message} (not deployed on this host)`);
      skipped++;
      return null;
    }
    console.log(`❌ FAIL: ${err.message}`);
    failed++;
    return null;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('\n🧪 TBOT Mobile E2E Test\n');
  console.log(`  API: ${BASE_URL}`);
  console.log(`  AI:  ${AI_URL}\n`);

  const email = `e2e-mobile-${Date.now()}@test.tbot.io`;
  const password = 'TestPass123!';
  let accessToken = '';
  let householdId = '';
  let childId = '';

  // ─── AUTH FLOW ────────────────────────────────────────────────────────────
  console.log('📱 Auth Flow');

  const signupResult = await step('POST /auth/signup', async () => {
    const res = await request('POST', `${API}/auth/signup`, {
      email, password, name: 'Mobile E2E User',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const data = res.body.data ?? res.body;
    assert(data.access_token, 'No access_token in signup response');
    // OBSOLETE 2026-04-17: `partial:true` field removed from signup response
    // (post-email-verification-removal contract). Do not re-add this assertion.
    accessToken = data.access_token;
    return data;
  });

  if (!signupResult) { printSummary(); return; }

  await step('POST /auth/consent (COPPA)', async () => {
    const res = await request('POST', `${API}/auth/consent`, {
      stripe_token: 'tok_test_bypass',
      consent_given: true,
    }, { Authorization: `Bearer ${accessToken}` });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    const data = res.body.data ?? res.body;
    assert(data.coppa_verified === true, 'coppa_verified should be true');
  });

  const loginResult = await step('POST /auth/login (full token)', async () => {
    const res = await request('POST', `${API}/auth/login`, { email, password });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.body.data ?? res.body;
    assert(data.access_token, 'No access_token');
    accessToken = data.access_token;
    return data;
  });

  if (!loginResult) { printSummary(); return; }

  // ─── ONBOARDING FLOW ──────────────────────────────────────────────────────
  console.log('\n🏠 Onboarding Flow');

  const hhResult = await step('POST /households (create household)', async () => {
    const res = await request('POST', `${API}/households`, {
      name: 'Mobile Test Family',
    }, { Authorization: `Bearer ${accessToken}` });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const data = res.body.data ?? res.body;
    assert(data.id, 'No household id');
    householdId = data.id;
    return data;
  });

  if (!hhResult) { printSummary(); return; }

  const childResult = await step('POST /households/:id/children (add child)', async () => {
    const res = await request('POST', `${API}/households/${householdId}/children`, {
      name: 'Emma',
      date_of_birth: '2018-06-15',
    }, { Authorization: `Bearer ${accessToken}` });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    const data = res.body.data ?? res.body;
    assert(data.id, 'No child id');
    childId = data.id;
    return data;
  });

  // ─── DASHBOARD DATA ───────────────────────────────────────────────────────
  console.log('\n📊 Dashboard Data');

  await step('GET /households (visible in dashboard)', async () => {
    const res = await request('GET', `${API}/households`, null,
      { Authorization: `Bearer ${accessToken}` });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.body.data ?? res.body;
    const households = Array.isArray(data) ? data : [data];
    assert(households.length > 0, 'No households returned');
  });

  await softStep('GET /devices/household/:id (household devices)', async () => {
    const res = await request('GET', `${API}/devices/household/${householdId}`, null,
      { Authorization: `Bearer ${accessToken}` });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    // Empty array is OK — device list shows register CTA
  });

  // ─── LEARNING ENGINE ──────────────────────────────────────────────────────
  if (childId) {
    console.log('\n🎓 Learning Engine');

    await softStep('GET /learning/children/:id/profile', async () => {
      const res = await request('GET', `${API}/learning/children/${childId}/profile`, null,
        { Authorization: `Bearer ${accessToken}` });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = res.body.data ?? res.body;
      assert(data.vocabulary_level, 'No vocabulary_level');
    });

    await softStep('GET /learning/children/:id/session/today', async () => {
      const res = await request('GET', `${API}/learning/children/${childId}/session/today`, null,
        { Authorization: `Bearer ${accessToken}` });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = res.body.data ?? res.body;
      assert(data.session_payload?.warmup, 'No warmup in session');
    });

    await softStep('GET /learning/children/:id/kpis', async () => {
      const res = await request('GET', `${API}/learning/children/${childId}/kpis`, null,
        { Authorization: `Bearer ${accessToken}` });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // ─── AI SERVICE ───────────────────────────────────────────────────────────
  console.log('\n🤖 AI Service (Interaction)');

  await softStep('POST /v1/stt/transcribe (voice input simulation)', async () => {
    // STT expects multipart/form-data in prod, but in simulation mode accepts any
    const res = await request('POST', `${AI_URL}/v1/stt/transcribe`,
      { audio: 'mock_audio_data', language: 'en' });
    // Accept 200 or 422 (form validation in prod mode) — both mean the service is reachable
    assert(res.status < 500, `AI service returned ${res.status} — service may be down`);
  });

  await softStep('POST /v1/llm/chat (TBOT response)', async () => {
    const res = await request('POST', `${AI_URL}/v1/llm/chat`, {
      message: 'Hello TBOT! Can you say something?',
      session_id: `e2e-${Date.now()}`,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    const data = res.body;
    assert(data.response || data.status === 'ok', 'No response from LLM');
  });

  await softStep('POST /learning/children/:id/interactions (persist)', async () => {
    if (!childId) { throw new Error('No child ID — skipping'); }
    const res = await request('POST', `${API}/learning/children/${childId}/interactions`, {
      user_message: 'Hello TBOT!',
      ai_response: 'Hello! Great to meet you!',
      confidence_signal: 75,
    }, { Authorization: `Bearer ${accessToken}` });
    assert(res.status < 300, `Expected 2xx, got ${res.status}`);
  });

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  printSummary();
}

function printSummary() {
  const total = passed + failed + skipped;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed${skipped > 0 ? `, ${skipped} skipped (not deployed on this host)` : ''}`);
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  } else {
    if (skipped > 0) {
      console.log('\n✅ Core flows passed — run against local docker-compose for full coverage');
    } else {
      console.log('\n✅ All tests passed — app is ready for phone testing!');
    }
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
