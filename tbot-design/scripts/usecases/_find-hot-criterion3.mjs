#!/usr/bin/env node
// Phase 1.5: identify UCs with >5 Main Flow steps AND ≥2 alt/error flows.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DOMAINS = resolve(ROOT, 'docs/usecases/domains');

const hot = [];
for (const d of readdirSync(DOMAINS)) {
  const path = resolve(DOMAINS, d, 'use-cases.md');
  if (!existsSync(path)) continue;
  const txt = readFileSync(path, 'utf8');
  const sections = txt.split(/^## (UC-[A-Z]{1,2}\d+)/m).slice(1);
  for (let i = 0; i < sections.length; i += 2) {
    const id = sections[i];
    const body = sections[i + 1] ?? '';
    // Count Main Flow steps: lines like "  1. ..." through "  N. ..." inside Main Flow
    const mfMatch = body.match(/\*\*Main Flow:\*\*([\s\S]*?)(?=\n\s*-\s+\*\*[A-Z]|\n## |$)/);
    let mfSteps = 0;
    if (mfMatch) {
      const stepLines = mfMatch[1].match(/^\s+\d+\.\s/gm) ?? [];
      mfSteps = stepLines.length;
    }
    // Count alt/error blocks
    const altPresent = /\*\*Alt Flow:\*\*/.test(body);
    const errPresent = /\*\*Error Flow:\*\*/.test(body);
    const altErrCount = (altPresent ? 1 : 0) + (errPresent ? 1 : 0);
    if (mfSteps > 5 && altErrCount >= 2) {
      hot.push({ id, domain: d, mfSteps, altErrCount });
    }
  }
}
hot.sort((a, b) => b.mfSteps - a.mfSteps || a.id.localeCompare(b.id, 'en', { numeric: true }));
console.log(`Found ${hot.length} criterion-3 hot UCs:`);
for (const h of hot) console.log(`  ${h.id} (${h.domain}): mfSteps=${h.mfSteps}, alt+err=${h.altErrCount}`);
