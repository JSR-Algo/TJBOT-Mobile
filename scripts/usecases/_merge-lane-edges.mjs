#!/usr/bin/env node
// Phase 1.5: merge Lane A/B/C/D PR-description edge proposals into cross-domain-edges.json.
// Deterministic alphabetical sort by {source, target, kind}. Skip duplicates.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { DOCS_ROOT, APP_ROOT } from '../_lib/paths.mjs';

const ROOT = DOCS_ROOT;
const FILE = resolve(ROOT, 'usecases/reference/cross-domain-edges.json');
const cur = JSON.parse(readFileSync(FILE, 'utf8'));

// Lane proposals (verbatim from team-lead message; FB→F normalization for fallback prefix)
const LANE = [
  // Lane A
  ['UC-O04', 'UC-L01', 'launches', 'Lane A: first lesson handoff via go("lesson_ready")'],
  // Lane B
  ['UC-H03', 'UC-L01', 'launches', 'Lane B: lesson via lesson_ready'],
  ['UC-H05', 'UC-C07', 'launches', 'Lane B: review entry'],
  ['UC-H06', 'UC-P01', 'launches', "Lane B: today's progress"],
  ['UC-H08', 'UC-PR01', 'requires', 'Lane B: parent gate'],
  ['UC-C06', 'UC-L01', 'launches', 'Lane B: start lesson from detail'],
  ['UC-C07', 'UC-L01', 'launches', 'Lane B: start review'],
  ['UC-C08', 'UC-L01', 'launches', 'Lane B: start daily mission'],
  ['UC-C01', 'UC-H01', 'exits', 'Lane B: back home from course tree'],
  ['UC-C07', 'UC-H01', 'exits', 'Lane B: back home from review'],
  ['UC-C08', 'UC-H01', 'exits', 'Lane B: back home from mission'],
  ['UC-L02', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: connect realtime voice'],
  ['UC-L03', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: greeting from voice'],
  ['UC-L05', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: robot speech via voice'],
  ['UC-L07', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: child utterance to voice'],
  ['UC-L08', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: process via voice'],
  ['UC-L09', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: success feedback via voice'],
  ['UC-L10', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: gentle correction via voice'],
  ['UC-L11', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: retry prompt via voice'],
  ['UC-L12', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: silence prompt via voice'],
  ['UC-L13', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: off-topic redirect via voice'],
  ['UC-L21', 'ACTOR:RealtimeVoice', 'delegate', 'Lane B: report safety event upstream'],
  ['UC-L16', 'UC-P03', 'emits', 'Lane B: lesson done → summary'],
  ['UC-L16', 'UC-H01', 'exits', 'Lane B: lesson done → home'],
  ['UC-L17', 'UC-H01', 'exits', 'Lane B: exit confirm → home'],
  ['UC-L18', 'UC-F02', 'launches', 'Lane B: reconnect exhausted (FB02 mic-missing or fallback path)'],
  ['UC-L19', 'UC-H01', 'exits', 'Lane B: audio error → home'],
  ['UC-L19', 'UC-F04', 'launches', 'Lane B: audio error → voice failed'],
  ['UC-L20', 'UC-H01', 'exits', 'Lane B: safety break → home'],
  // Lane C
  ['UC-PR03', 'UC-PR02', 'exits', 'Lane C: back to summary'],
  ['UC-PR05', 'UC-F07', 'emits', 'Lane C: safety log on updateSafetyConfig'],
  ['UC-PR06', 'ACTOR:Robot', 'delegate', 'Lane C: firmware test delegate'],
  ['UC-P03', 'UC-P04', 'launches', 'Lane C: review needed branch'],
  ['UC-P04', 'UC-L01', 're-enters', 'Lane C: re-enter lesson as review'],
  ['UC-BU07', 'UC-BU08', 'extend', 'Lane C: extend pay options (Apple Pay)'],
  ['UC-BU07', 'UC-BU09', 'extend', 'Lane C: extend pay options (card)'],
  // Lane D
  ['UC-DP10', 'UC-DP13', 'continues', 'Lane D: pairing success → rename'],
  ['UC-DP14', 'UC-L01', 'launches', 'Lane D: first lesson handoff after pairing'],
  ['UC-CL07', 'UC-CL08', 'continues', 'Lane D: robot ready → monitor'],
  ['UC-CL08', 'UC-CL09', 'continues', 'Lane D: monitor → companion view'],
  ['UC-DM03', 'ACTOR:Robot', 'delegate', 'Lane D: chime delegate (already present, dup-skip)'],
  ['UC-DM04', 'ACTOR:Robot', 'delegate', 'Lane D: firmware delegate (already present, dup-skip)'],
  ['UC-F01', 'UC-F06', 'extend', 'Lane D: try again → reconnect overlay'],
  ['UC-F06', 'UC-L06', 'resumes', 'Lane D: auto-resume → listen-kid'],
  ['UC-F07', 'UC-PR01', 'requires', 'Lane D: parent confirm → gate'],
  ['UC-F01', 'UC-H01', 'exits', 'Lane D: back-home from network error'],
  ['UC-F02', 'UC-H01', 'exits', 'Lane D: back-home from mic missing'],
  ['UC-F04', 'UC-H01', 'exits', 'Lane D: back-home from voice failed'],
  ['UC-F05', 'UC-H01', 'exits', 'Lane D: back-home from resume'],
  ['UC-F07', 'UC-H01', 'exits', 'Lane D: back-home from safety redirect'],
];

const seen = new Set(cur.edges.map(e => `${e.source}|${e.target}|${e.kind}`));
let added = 0, skipped = 0;
for (const [s, t, k, n] of LANE) {
  const key = `${s}|${t}|${k}`;
  if (seen.has(key)) { skipped++; continue; }
  seen.add(key);
  cur.edges.push({ source: s, target: t, kind: k, ...(n ? { note: n } : {}) });
  added++;
}

cur.edges.sort((a, b) => (a.source + '|' + a.target + '|' + a.kind).localeCompare(b.source + '|' + b.target + '|' + b.kind, 'en', { numeric: true }));
cur.total = cur.edges.length;
cur.source = 'Phase 0 hand-curated 56 edges + Phase 1.5 lane PR-description proposals (deterministic alpha-sort by {source,target,kind})';
writeFileSync(FILE, JSON.stringify(cur, null, 2) + '\n');
console.log(`Merged: added=${added}, skipped(dup)=${skipped}, total=${cur.edges.length}`);
