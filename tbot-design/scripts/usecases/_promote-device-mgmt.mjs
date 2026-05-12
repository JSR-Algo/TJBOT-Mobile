#!/usr/bin/env node
// Phase 1.5: Lane D added device-mgmt.usecase.puml. Promote 6 device-mgmt UCs from
// override:"no-puml" to override:"manual:UC_DM_*" and populate index aliases.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const IDX = resolve(ROOT, 'docs/usecases/reference/use-case-index.json');
const OVR = resolve(ROOT, 'docs/usecases/reference/alias-overrides.json');

const DM_MAP = {
  'UC-DM01': 'UC_DM_HOME',
  'UC-DM02': 'UC_DM_SESSION',
  'UC-DM03': 'UC_DM_FIND',
  'UC-DM04': 'UC_DM_FIRMWARE',
  'UC-DM05': 'UC_DM_LCD_LIB',
  'UC-DM06': 'UC_DM_LCD_TURN',
};

const idx = JSON.parse(readFileSync(IDX, 'utf8'));
const ovr = JSON.parse(readFileSync(OVR, 'utf8'));

// Update index aliases
for (const e of idx.entries) {
  if (DM_MAP[e.id]) e.aliases = [DM_MAP[e.id]];
}

// Update overrides: remove no-puml DM entries, add manual:DM entries
ovr.overrides = ovr.overrides.filter(o => !DM_MAP[o.id]);
for (const [id, alias] of Object.entries(DM_MAP)) {
  ovr.overrides.push({
    id,
    override: `manual: ${alias}`,
    reason: 'KD5 resolved — Lane D added device-mgmt.usecase.puml in Phase 1; manually mapped (puml title contains em-dash and qualifiers that defeat fuzzy ratio)',
  });
}
ovr.overrides.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
ovr.total = ovr.overrides.length;

writeFileSync(IDX, JSON.stringify(idx, null, 2) + '\n');
writeFileSync(OVR, JSON.stringify(ovr, null, 2) + '\n');
console.log(`Promoted 6 device-mgmt UCs. New no-puml count = ${ovr.overrides.filter(o => o.override === 'no-puml').length}`);
