#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeScreenProps } from './_lib/screen-prop-analysis.mjs';

const args = process.argv.slice(2);
try {
  if (args.length && (args.length !== 2 || args[0] !== '--root')) throw new Error('Usage: check-screen-prop-types.mjs [--root mobile-root]');
  const root = args.length ? resolve(args[1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = analyzeScreenProps(root);
  console.info(`check-screen-prop-types: scanned=${result.scanned} typed=${result.typed} registered=${result.registered} unregistered=${result.unregistered.length} violations=${result.violations.length}`);
  for (const file of result.unregistered) console.info(`  unregistered (no runtime registration inferred): ${file}`);
  for (const message of result.violations) console.error(`  ${message}`);
  if (result.violations.length) process.exitCode = 1;
  else console.info('check-screen-prop-types: PASS component prop/registration identities');
} catch (error) {
  console.error('check-screen-prop-types: FAILED required input/analysis:', error);
  process.exitCode = 1;
}
