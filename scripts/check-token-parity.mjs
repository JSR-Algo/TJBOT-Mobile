#!/usr/bin/env node
/**
 * Verify design-system token files are present at src/design-system/tokens/
 * and contain the required canonical keys.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tokensDir = join(root, 'src/design-system/tokens');

const required = {
  'colors.ts':     ['cream', 'coral', 'sky', 'mint', 'sun', 'plum', 'ink', 'paper', 'dangerSoft', 'bot'],
  'spacing.ts':    ['xs', 'sm', 'md', 'base', 'lg', 'xl', 'xxl'],
  'radii.ts':      ['card', 'button', 'chip'],
  'shadows.ts':    ['card', 'pill', 'button'],
  'typography.ts': ['fonts', 'fontSizes', 'fontWeights'],
  'motion.ts':     [],
  'index.ts':      ['tokens'],
};

let errors = [];

for (const [file, keys] of Object.entries(required)) {
  const path = join(tokensDir, file);
  if (!existsSync(path)) {
    errors.push(`Missing token file: src/design-system/tokens/${file}`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  for (const key of keys) {
    if (!text.includes(key)) {
      errors.push(`src/design-system/tokens/${file}: missing key '${key}'`);
    }
  }
}

if (errors.length > 0) {
  console.error('Token parity check FAILED:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
}

const fileCount = Object.keys(required).length;
console.log(`Token parity OK — ${fileCount} token files verified.`);
process.exit(0);
