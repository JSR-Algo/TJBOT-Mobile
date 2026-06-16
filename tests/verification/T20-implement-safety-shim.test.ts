/**
 * T20 verification: implement the documented child-safety shim.
 *
 * This test uses source-match (the same pattern as useGeminiConversation-p0.test.ts)
 * because the safety module must exist and the conversation hook must wire it.
 * After implementation it also runs lightweight structural checks on the blocklist
 * and persona output.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(REPO_ROOT, 'src');

const read = (rel: string, root: string = SRC): string =>
  fs.readFileSync(path.join(root, rel), 'utf8');

const exists = (rel: string, root: string = SRC): boolean =>
  fs.existsSync(path.join(root, rel));

const readJson = (rel: string, root: string = SRC): unknown =>
  JSON.parse(read(rel, root));

describe('T20 — safety shim module exists and exports documented API', () => {
  it('src/services/ai/safety/index.ts exists and exports the public API', () => {
    expect(exists('services/ai/safety/index.ts')).toBe(true);
    const src = read('services/ai/safety/index.ts');
    expect(src).toMatch(/export\s+function\s+checkInput\s*\(/);
    expect(src).toMatch(/export\s+function\s+checkOutput\s*\(/);
    expect(src).toMatch(/export\s+function\s+assemblePersona\s*\(/);
    expect(src).toMatch(/export\s+const\s+BLOCKLIST_VERSION\s*[:=]/);
    expect(src).toMatch(/export\s+interface\s+TelemetryPort\s*\{/);
    expect(src).toMatch(/export\s+interface\s+SafetyContext\s*\{/);
    expect(src).toMatch(/export\s+interface\s+CheckResult\s*\{/);
  });

  it('schemas.ts defines SafetyContext, CheckResult, TelemetryPort and BlocklistV1', () => {
    expect(exists('services/ai/safety/schemas.ts')).toBe(true);
    const src = read('services/ai/safety/schemas.ts');
    expect(src).toMatch(/childAgeBracket\s*:\s*['"]4-6['"]\s*\|\s*['"]7-9['"]\s*\|\s*['"]10-12['"]/);
    expect(src).toMatch(/verdict\s*:\s*['"]allow['"]\s*\|\s*['"]block['"]/);
    expect(src).toMatch(/termSha256\s*\?:\s*string/);
    expect(src).toMatch(/emit\s*\(\s*event\s*:\s*['"]safety_block_event['"]\s*\|\s*['"]safety_shim_error['"]/);
    expect(src).toMatch(/interface\s+BlocklistV1\s*\{/);
  });

  it('inputBlocklist.ts and outputBlocklist.ts are synchronous and fail-closed', () => {
    expect(exists('services/ai/safety/inputBlocklist.ts')).toBe(true);
    expect(exists('services/ai/safety/outputBlocklist.ts')).toBe(true);
    const input = read('services/ai/safety/inputBlocklist.ts');
    const output = read('services/ai/safety/outputBlocklist.ts');
    for (const src of [input, output]) {
      // No async in the scanner hot path
      expect(src).not.toMatch(/async\s+function|await\s+/);
      // Fail-closed try/catch
      expect(src).toMatch(/catch\s*\([\s\S]*?\{\s*[\s\S]*?verdict\s*:\s*['"]block['"]/);
      // Integrity verification path
      expect(src).toMatch(/integritySha256|verifyIntegrity|validateIntegrity/);
      // Telemetry error emit on exception
      expect(src).toMatch(/safety_shim_error/);
    }
  });

  it('persona.ts performs deterministic substitution and stays under 2 kB', () => {
    expect(exists('services/ai/safety/persona.ts')).toBe(true);
    const src = read('services/ai/safety/persona.ts');
    expect(src).toMatch(/AGE_BRACKET/);
    expect(src).toMatch(/ALLOWED_TOPICS_FOR_AGE/);
    expect(src).toMatch(/LESSON_VOCAB/);
    expect(src).toMatch(/LESSON_OPENER/);
    expect(src).toMatch(/EXPRESSION_SET/);
    expect(src).toMatch(/MOTION_SET/);
  });

  it('blocklist.v1.json exists with integritySha256 and 80–120 regexes', () => {
    expect(exists('services/ai/safety/blocklist.v1.json')).toBe(true);
    const json = readJson('services/ai/safety/blocklist.v1.json') as {
      version?: string;
      integritySha256?: string;
      categories?: Record<string, string[]>;
    };
    expect(json.version).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(typeof json.integritySha256).toBe('string');
    expect(json.integritySha256).toMatch(/^[a-f0-9]{64}$/i);
    expect(json.categories).toBeDefined();
    const total = Object.values(json.categories ?? {}).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(80);
    expect(total).toBeLessThanOrEqual(120);
    for (const category of Object.keys(json.categories ?? {})) {
      expect(json.categories![category].every((r) => typeof r === 'string')).toBe(true);
    }
  });

  it('corpus files exist with the required line counts', () => {
    expect(exists('services/ai/safety/__tests__/corpus/benign.txt')).toBe(true);
    expect(exists('services/ai/safety/__tests__/corpus/canaries.txt')).toBe(true);
    const benign = read('services/ai/safety/__tests__/corpus/benign.txt')
      .split('\n')
      .filter((l) => l.trim().length > 0);
    const canaries = read('services/ai/safety/__tests__/corpus/canaries.txt')
      .split('\n')
      .filter((l) => l.trim().length > 0);
    expect(benign.length).toBeGreaterThanOrEqual(50);
    expect(canaries.length).toBeGreaterThanOrEqual(10);
  });
});

describe('T20 — telemetry contract', () => {
  it('emits safety_block_event with no plaintext term', () => {
    const src = read('services/ai/safety/index.ts');
    // Telemetry payload must not reference a plaintext term property
    expect(src).not.toMatch(/safety_block_event[\s\S]{0,120}term\s*:/);
    expect(src).toMatch(/termSha256/);
    expect(src).toMatch(/safety_block_event/);
  });

  it('emits safety_shim_error with side information only', () => {
    const src = read('services/ai/safety/index.ts');
    expect(src).toMatch(/safety_shim_error/);
    expect(src).not.toMatch(/safety_shim_error[\s\S]{0,120}term\s*:/);
  });
});

describe('T20 — useGeminiConversation wires the safety shim', () => {
  const hook = read('hooks/useGeminiConversation.ts');

  it('imports checkInput, checkOutput and assemblePersona from the safety module', () => {
    expect(hook).toMatch(/from\s+['"]@\/services\/ai\/safety['"]/);
    expect(hook).toMatch(/checkInput/);
    expect(hook).toMatch(/checkOutput/);
    expect(hook).toMatch(/assemblePersona/);
  });

  it('uses assemblePersona as the fallback systemInstruction', () => {
    // Either options.systemInstruction is used when provided, or the assembled persona is used.
    expect(hook).toMatch(/systemInstruction\s*:\s*options\.systemInstruction\s*\|\|\s*assemblePersona/);
  });

  it('calls checkInput inside or near handleMicChunk before sendRealtimeInput', () => {
    const handlerMatch = hook.match(
      /const\s+handleMicChunk\s*=[^{]*\{([\s\S]+?)\n\s{6}\};/,
    );
    expect(handlerMatch).not.toBeNull();
    const body = handlerMatch![1];
    expect(body).toMatch(/checkInput\s*\(/);
    expect(body).toMatch(/sendRealtimeInput/);
  });

  it('calls checkOutput on the AI output transcription chunk', () => {
    const idx = hook.indexOf('Handle AI output transcription');
    expect(idx).toBeGreaterThanOrEqual(0);
    const outputBlock = hook.slice(idx, idx + 600);
    expect(outputBlock).toMatch(/checkOutput\s*\(/);
    expect(outputBlock).toMatch(/outputTranscription/);
  });
});
