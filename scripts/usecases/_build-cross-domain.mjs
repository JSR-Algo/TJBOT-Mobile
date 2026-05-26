#!/usr/bin/env node
// One-shot builder for cross-domain-edges.json.
// Sources:
//   1. Manual entries from architecture/usecases/README.md "Cross-Domain Relation Map" section.
//   2. Cross-package edges parsed from each *.usecase.puml (where source-puml's package differs from target alias's package).
//   3. Cross-domain handoff edges in 00-overview.puml (D_X ..> D_Y).
// Idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const INDEX = JSON.parse(readFileSync(resolve(ROOT, 'usecases/reference/use-case-index.json'), 'utf8'));
const OUT = resolve(ROOT, 'usecases/reference/cross-domain-edges.json');

// alias → UC-LL-NN (reverse from index)
const aliasToId = {};
for (const e of INDEX.entries)
  for (const a of e.aliases) aliasToId[a] = e.id;

const edges = [];
const seen = new Set();
function add(source, target, kind, note) {
  const key = `${source}|${target}|${kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ source, target, kind, ...(note ? { note } : {}) });
}

// --- 1. Hand-curated cross-domain handoffs from architecture README + plan §1.4 ---
// Format: [source UC, target UC | "ACTOR:Name", kind, note]
// These derive from the "Cross-Domain Relation Map" + 00-overview.puml + per-puml [exit] notes.
const HANDOFFS = [
  // From kid-hub
  ['UC-H08', 'UC-PR01', 'requires',  'Enter Parent Space → Parent Gate'],
  ['UC-H03', 'UC-L01',  'launches',  "Start Today's Lesson → voice session"],
  ['UC-H04', 'UC-C01',  'launches',  'Open Course → course tree'],
  ['UC-H05', 'UC-C07',  'launches',  'Open Review → start review'],
  ['UC-H06', 'UC-P01',  'launches',  "Open Today's Progress"],
  // course-browse → lesson-session
  ['UC-C05', 'UC-L01',  'launches',  'Lesson Detail Start → voice session'],
  ['UC-C06', 'UC-L01',  'launches',  'Start Lesson From Detail (legacy-only UC)'],
  ['UC-C07', 'UC-L01',  'launches',  'Start Review → voice session'],
  ['UC-C08', 'UC-L01',  'launches',  'Start Daily Mission → voice session'],
  // lesson-session ↔ progress, kid-hub, fallback
  ['UC-L16', 'UC-P03',  'emits',     'Complete Lesson → Lesson Summary'],
  ['UC-L17', 'UC-H01',  'exits',     'Confirm Exit → Home Hub'],
  ['UC-P04', 'UC-L01',  're-enters', 'Review Needed → re-enter session'],
  // parent-gate consumers (parent-summary, course-library, robot-mgmt, device-pairing, purchase)
  ['UC-PR02', 'UC-PR01', 'requires', 'Parent Summary requires gate'],
  ['UC-CL01', 'UC-PR01', 'requires', 'Browse Library requires gate'],
  ['UC-DP01', 'UC-PR01', 'requires', 'Device Overview requires gate'],
  ['UC-RM01', 'UC-PR01', 'requires', 'My Robot requires gate'],
  ['UC-CL03', 'UC-CL04', 'include',  'Buy/Unlock includes 4-digit confirm (UC_PG_UNLOCK)'],
  // parent-summary → robot-mgmt
  ['UC-PR06', 'UC-RM01', 'exits',    'Parent Settings → Robot software'],
  // course-library ↔ device-pairing, robot-mgmt
  ['UC-CL01', 'UC-DP01', 'requires', 'Library requires robot paired'],
  ['UC-CL11', 'UC-RM04', 'exits',    'Resync → Update Wi-Fi'],
  // purchase → course-library, device-pairing
  ['UC-BU14', 'UC-CL05', 'continues', 'First course → cl_added'],
  ['UC-BU13', 'UC-DP02', 'continues', 'Activate Robot → pair flow (narrative)'],
  // robot-mgmt → course-library
  ['UC-RM05', 'UC-CL01', 'exits',    'Storage → Browse Library'],
  // fallback ↔ lesson-session, kid-hub
  ['UC-F05', 'UC-L05',   'resumes',  'Resume Lesson → Listen to Robot'],
  ['UC-F06', 'UC-L06',   'resumes',  'Reconnecting overlay → Listen for Child'],
  ['UC-F08', 'UC-H01',   'exits',    'App error → back home'],
  ['UC-F02', 'UC-F03',   'extend',   'Mic Missing → Audio Recovery (within fallback)'],
  ['UC-F04', 'UC-F05',   'extend',   'Voice Failed → Resume Lesson (within fallback)'],
  // onboarding → auth, lesson-session
  ['UC-O04', 'UC-L01',   'launches', 'Enter First Lesson → voice session'],
  ['UC-O01', 'UC-A03',   'continues', 'Onboarding → Login step'],
  ['UC-O01', 'UC-A02',   'continues', 'Onboarding → Sign Up step'],
  // auth success → kid-hub
  ['UC-A03', 'UC-H01',   'exits',    'Login success → Home Hub'],
  ['UC-A08', 'UC-H01',   'exits',    'Set up child → Home Hub'],
  // lesson-session safety → fallback
  ['UC-L20', 'UC-F07',   'launches', 'Safety fallback → Safety Redirect'],
  ['UC-L20', 'UC-L21',   'include',  'Trigger Safety Fallback → Report Safety Event (intra-domain, here for completeness)'],
  // Actor-target delegations (external systems)
  ['UC-A04', 'ACTOR:Google',         'delegate', 'Continue with Google'],
  ['UC-A05', 'ACTOR:Apple',          'delegate', 'Continue with Apple'],
  ['UC-O03', 'ACTOR:DeviceOS',       'delegate', 'Mic permission → OS sheet'],
  ['UC-L02', 'ACTOR:RealtimeVoice',  'delegate', 'Connect realtime voice'],
  ['UC-L08', 'ACTOR:RealtimeVoice',  'delegate', 'Process utterance → voice service'],
  ['UC-CL06', 'ACTOR:Robot',         'delegate', 'Send lesson to robot'],
  ['UC-CL08', 'ACTOR:Robot',         'delegate', 'Monitor lesson on robot'],
  ['UC-CL11', 'ACTOR:Robot',         'delegate', 'Resync robot'],
  ['UC-DP04', 'ACTOR:Robot',         'delegate', 'Scan for robot (radio)'],
  ['UC-DP07', 'ACTOR:WiFi',          'delegate', 'Pick Wi-Fi'],
  ['UC-DP09', 'ACTOR:Robot',         'delegate', 'Connect robot to Wi-Fi'],
  ['UC-DP09', 'ACTOR:WiFi',          'delegate', 'Connect robot to Wi-Fi'],
  ['UC-RM06', 'ACTOR:Robot',         'delegate', 'OTA update'],
  ['UC-RM08', 'ACTOR:Robot',         'delegate', 'Mic test'],
  ['UC-RM09', 'ACTOR:Robot',         'delegate', 'Speaker test'],
  ['UC-RM10', 'ACTOR:Robot',         'delegate', 'Factory reset'],
  ['UC-DM03', 'ACTOR:Robot',         'delegate', 'Find My Robot — chime'],
  ['UC-DM04', 'ACTOR:Robot',         'delegate', 'Update firmware (KD5 — pending puml)'],
  ['UC-BU08', 'ACTOR:Pay',           'delegate', 'Apple Pay'],
  ['UC-BU09', 'ACTOR:Pay',           'delegate', 'Card payment'],
  ['UC-BU13', 'ACTOR:Robot',         'delegate', 'Activate via code'],
];

for (const [s, t, k, n] of HANDOFFS) add(s, t, k, n);

edges.sort((a, b) => (a.source + a.target + a.kind).localeCompare(b.source + b.target + b.kind, 'en', { numeric: true }));

const out = {
  generated_by: 'scripts/usecases/_build-cross-domain.mjs',
  source: 'hand-curated from docs/architecture/usecases/README.md Cross-Domain Relation Map + 00-overview.puml + per-puml [exit] notes',
  total: edges.length,
  edges,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT} (${edges.length} edges)`);
