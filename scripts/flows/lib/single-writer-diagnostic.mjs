import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function gitQuery(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return { ok: !result.error && result.status === 0, output: result.stdout?.trim() ?? '',
    diagnostic: result.error?.message ?? result.stderr?.trim() ?? '', status: result.status };
}

export function singleWriterDiagnostic(root, query = args => gitQuery(root, args), readSubject = () => {
  // Preserve the existing best-effort message location; this is not full lane enforcement.
  const file = path.join(root, '..', '.git', 'COMMIT_EDITMSG');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/)[0] : '';
}) {
  const unavailable = (operation, result) => ({ status: 'unavailable', warnings: [],
    reason: `${operation}: ${result.diagnostic || `Git returned ${result.status} without usable output`}` });
  const branchResult = query(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branchResult.ok || !branchResult.output || branchResult.output === 'HEAD') return unavailable('branch query', branchResult);
  const branch = branchResult.output;
  const topResult = query(['rev-parse', '--show-toplevel']);
  if (!topResult.ok || !topResult.output) return unavailable('Git root query', topResult);
  const top = topResult.output;
  if (root !== top && !root.startsWith(top + path.sep)) return unavailable('Git root query', { diagnostic: 'project is outside Git root' });
  const prefix = root === top ? '' : root.slice(top.length + 1) + '/';
  const guardedTargets = [
    `${prefix}nav-graph-data.json`, `${prefix}docs/flows/domains/`,
    `${prefix}docs/flows/global.generated.mmd`, `${prefix}docs/flows/shared/cross-domain.flow.mmd`,
    `${prefix}docs/flows/user-flow.md`, `${prefix}docs/flows/user-flow.html`,
  ];
  let subject;
  try { subject = readSubject(); }
  catch (error) { return unavailable('commit-message diagnostic', { diagnostic: error.message }); }
  const suspectsLaneCommit = /^lane-[A-Da-d]-/.test(branch) || /\blane-[a-d]\b|\(lane-[a-d]\b/i.test(subject);
  if (!suspectsLaneCommit) return { status: 'not-triggered', branch, warnings: [] };
  const stagedResult = query(['diff', '--cached', '--name-only']);
  if (!stagedResult.ok) return unavailable('staged-file query', stagedResult);
  const staged = stagedResult.output.split(/\r?\n/).filter(Boolean);
  const warnings = [];
  for (const file of staged) {
    if (file.startsWith(`${prefix}docs/flows/domains/`) && path.basename(file) === 'README.md') continue;
    if (file === guardedTargets[0] || file.startsWith(guardedTargets[1]) || guardedTargets.slice(2).includes(file)) {
      warnings.push(`lane commit staging "${file}" — Lane Z exclusive. Unstage before push (process discipline; Phase 1.5 will overwrite if not unstaged).`);
    }
  }
  return { status: warnings.length ? 'warning' : 'checked', branch, warnings };
}
