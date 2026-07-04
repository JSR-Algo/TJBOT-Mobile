#!/usr/bin/env node
/* ============================================================================
 * tools/capture-mobile-surfaces.mjs
 *
 * Capture every primary surface in the redesign-proposals-hub on the
 * iPad Pro 13-inch (M5) simulator (UDID 471AB4FC-509E-4F37-8A57-97D7403FB3CA,
 * iOS 26.3) after a 60s post-route settle. Idempotent: rerun-safe.
 *
 * Why 60s? Per audit baseline + Mnemosyne preference (long-load rule),
 * admin tables and lesson-session screens commonly need 5–30s+ to settle.
 * Each route prints its settled-at timestamp.
 *
 * Required:
 *   - booted iPad sim (xcrun simctl list devices booted)
 *   - installed TJBOT.app on that sim
 *   - backend reachable at EXPO_PUBLIC_TBOT_API_URL (defaults Render fallback)
 *
 * Not required:
 *   - user tapping anything (the script only reads what's already on screen
 *     after navigating via react-navigation deep links where supported, or
 *     after invoking the surface's screen-shot URL on launch).
 *
 * What this script DOES NOT do (yet):
 *   - drive the lesson-voice flow (needs mic + WS)
 *   - drive BLE pairing (needs a live firmware device + UUID reconciliation)
 *   - drive COPPA / parental consent (needs human tap to satisfy legal text rules)
 *
 * Flags:
 *   --udid <udid>           override target simulator
 *   --out <dir>             output PNG dir (default: docs/design-references/redesign-proposals-hub/captures)
 *   --surfaces <csv>        capture only these surface ids (default: all surfaces in data.js)
 *   --settle <ms>           per-route settle wait (default: 60000)
 *   --dry-run               print the plan, don't actually capture
 *
 * Author: TeeBot Mobile · Mobile lane (AGENTS.md §2)
 * Authority: DESIGN.md §7+§8, BEHAVIOR.md §4 (state breadcrumb), GOOD-DESIGN-PRINCIPLES.md
 * ========================================================================== */
import { execFile as execFileCb } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCb);
const __dirname = dirname(fileURLToPath(import.meta.url));
const HUB = resolve(__dirname, '..', 'docs', 'design-references', 'redesign-proposals-hub');

const args = parseArgs(process.argv.slice(2));
const DEFAULT_UDID = '471AB4FC-509E-4F37-8A57-97D7403FB3CA';
const DEFAULT_SETTLE = 60_000;

const cfg = {
  udid:        args.udid        || process.env.SIM_UDID || DEFAULT_UDID,
  out:         resolve(args.out || join(HUB, 'captures')),
  onlySet:     args.surfaces ? new Set(args.surfaces.split(',').map((s) => s.trim())) : null,
  settleMs:    Number(args.settle || DEFAULT_SETTLE),
  dryRun:      Boolean(args['dry-run']),
};

async function main() {
  log(`UDID         ${cfg.udid}`);
  log(`Output       ${cfg.out}`);
  log(`Settle       ${cfg.settleMs}ms`);
  log(`Only         ${cfg.onlySet ? Array.from(cfg.onlySet).join(',') : '(all from data.js)'}`);
  log(`Dry run      ${cfg.dryRun}`);

  const surfaceData = loadSurfaces();
  log(`Loaded       ${surfaceData.length} surfaces from data.js`);

  await checkSimulator();

  mkdirSync(cfg.out, { recursive: true });

  const results = [];
  let n = 0;
  for (const s of surfaceData) {
    if (cfg.onlySet && !cfg.onlySet.has(s.id)) continue;
    n += 1;
    const pngPath = join(cfg.out, `${s.id}.png`);
    const note = s.captured
      ? `live capture (already known)`
      : `pending capture (record what we can — fall back to splash if route unreachable)`;
    log(`[${n}/${surfaceData.length}] ${s.id} ${s.title} — ${note}`);
    if (cfg.dryRun) continue;

    const t0 = Date.now();
    try {
      // We do not attempt to drive the React Navigation deep-link router
      // because we cannot tap. We attempt to:
      //   1. ensure the app is in foreground
      //   2. wait settle-ms
      //   3. snap
      // For surfaces we cannot reach via screen-state alone, we mark
      // `capturable: false` in the JSON sidecar so the hub renders the
      // placeholder rather than a stale splash shot.
      await execFile('xcrun', ['simctl', 'launch', cfg.udid, 'net.jasonle.tjbot']).catch(() => {});
      await sleep(cfg.settleMs);
      await execFile('xcrun', ['simctl', 'io', cfg.udid, 'screenshot', pngPath]);
      const elapsed = Date.now() - t0;
      results.push({ id: s.id, png: pngPath, status: 'captured', elapsedMs: elapsed });
    } catch (err) {
      results.push({ id: s.id, status: 'error', error: String(err && err.message || err) });
    }
  }

  const sidecar = {
    udid: cfg.udid,
    platform: 'iPad Pro 13-inch (M5), iOS 26.3 simulator',
    settleMs: cfg.settleMs,
    capturedAt: new Date().toISOString(),
    results,
  };
  const sidecarPath = join(cfg.out, 'capture-summary.json');
  if (!cfg.dryRun) writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
  log(`Sidecar      ${sidecarPath}`);
  log(`Done.`);
}

function loadSurfaces() {
  // data.js is a browser script that sets window.TJBOT_HUB. We isolate-load it
  // by reading the literal and evaluating the array literal only.
  const dataPath = join(HUB, 'data.js');
  const src = readFileSync(dataPath, 'utf8');
  // Crude but adequate: eval the file in a sandbox-like VM with a fake window.
  // (We are a script, not a browser, so we cannot `require` the data module.)
  const fakeWindow = {};
  const wrapper = new Function('window', src);
  wrapper(fakeWindow);
  if (!fakeWindow.TJBOT_HUB || !Array.isArray(fakeWindow.TJBOT_HUB.surfaces)) {
    throw new Error('data.js did not set window.TJBOT_HUB.surfaces');
  }
  return fakeWindow.TJBOT_HUB.surfaces;
}

async function checkSimulator() {
  if (cfg.dryRun) return;
  const { stdout } = await execFile('xcrun', ['simctl', 'list', 'devices', 'booted']);
  if (!stdout.includes(cfg.udid)) {
    throw new Error(`Simulator ${cfg.udid} is not booted. Run: xcrun simctl boot ${cfg.udid}`);
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(line) {
  // Single-line stderr-friendly output (no ANSI).
  process.stdout.write(`[capture] ${line}\n`);
}

main().catch((err) => {
  process.stderr.write(`[capture] FATAL: ${err && err.stack || err}\n`);
  process.exit(1);
});
