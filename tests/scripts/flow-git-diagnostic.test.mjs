import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { singleWriterDiagnostic } from '../../scripts/flows/lib/single-writer-diagnostic.mjs';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('native flow output separates content success from unavailable Git provenance', () => {
  const empty = mkdtempSync(join(tmpdir(), 'flow-git-'));
  try {
  const result = spawnSync(process.execPath, [join(mobile, 'scripts/flows/validate-go-calls.mjs')], {
    cwd: mobile, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, GIT_DIR: join(empty, 'missing-git') },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, 'single-writer process diagnostic must remain warn-only');
  assert.equal(result.stdout.includes('single-writer(branch=unknown): OK'), false);
  assert.match(result.stdout, /CONTENT CHECKS PASSED/);
  assert.match(result.stderr, /single-writer.*UNAVAILABLE/);
  assert.match(result.stderr, /unknown revision|not a git repository/);
  } finally { rmSync(empty, { recursive: true, force: true }); }
});

const success = output => ({ ok: true, output, diagnostic: '', status: 0 });
const failure = diagnostic => ({ ok: false, output: '', diagnostic, status: 128 });
function outcome(branch, staged = success('')) {
  return args => args.includes('--abbrev-ref') ? branch :
    args.includes('--show-toplevel') ? success(mobile) : staged;
}

test('classifies recorded unborn-HEAD failure as unavailable, retaining original reason', () => {
  const reason = "fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.";
  const result = singleWriterDiagnostic(mobile, outcome(failure(reason)), () => '');
  assert.equal(result.status, 'unavailable');
  assert.ok(result.reason.includes(reason));
});

test('successful ordinary branch is not hardcoded as unavailable or ownership verified', () => {
  const result = singleWriterDiagnostic(mobile, outcome(success('main')), () => '');
  assert.equal(result.status, 'not-triggered');
  assert.equal(result.branch, 'main');
});

test('failed required staged read is unavailable, while valid empty staged output is checked', () => {
  const failed = singleWriterDiagnostic(mobile, outcome(success('lane-a-work'), failure('index read failed')), () => '');
  assert.equal(failed.status, 'unavailable');
  assert.match(failed.reason, /staged-file query: index read failed/);
  const empty = singleWriterDiagnostic(mobile, outcome(success('lane-a-work')), () => '');
  assert.equal(empty.status, 'checked');
});

test('preserves lane warning targets and hand-curated README allowance', () => {
  const result = singleWriterDiagnostic(mobile,
    outcome(success('main'), success('nav-graph-data.json\ndocs/flows/domains/auth/README.md')),
    () => 'fix(lane-a): content');
  assert.equal(result.status, 'warning');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /nav-graph-data\.json/);
});

test('missing branch and failed Git root are unavailable', () => {
  assert.equal(singleWriterDiagnostic(mobile, outcome(success('')), () => '').status, 'unavailable');
  const result = singleWriterDiagnostic(mobile, args =>
    args.includes('--abbrev-ref') ? success('main') : failure('root unreadable'), () => '');
  assert.equal(result.status, 'unavailable');
  assert.match(result.reason, /root unreadable/);
});
