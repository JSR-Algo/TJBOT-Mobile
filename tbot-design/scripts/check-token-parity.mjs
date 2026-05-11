#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const cssText = readFileSync(join(root, 'public/tokens.css'), 'utf8');

// Extract only :root { ... } block (not gender overrides)
const rootBlock = cssText.match(/:root\s*\{([^}]+)\}/)?.[1] ?? '';
const cssVars = [...rootBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)]
  .map(([, name]) => name.trim());

// Color vars from CSS (exclude font/size/radii — those have JS-only names)
const colorVarNames = cssVars.filter(v => !v.startsWith('t-') && !v.startsWith('r-') && !v.match(/^(kid-font|display|body)$/));

const colorsJs = readFileSync(join(root, 'src/design-system/tokens/colors.js'), 'utf8');

// Map CSS var names to expected JS key paths
const cssToJs = {
  'cream':       'cream',
  'cream-2':     'cream2',
  'coral':       'coral',
  'coral-soft':  'coralSoft',
  'sky':         'sky',
  'sky-soft':    'skySoft',
  'mint':        'mint',
  'mint-soft':   'mintSoft',
  'sun':         'sun',
  'plum':        'plum',
  'ink':         'ink',
  'ink-soft':    'inkSoft',
  'paper':       'paper',
  'paper-2':     'paper2',
  'danger-soft': 'dangerSoft',
  'bot-body':    'bot.body',
  'bot-body-2':  'bot.body2',
  'bot-shadow':  'bot.shadow',
  'bot-eye':     'bot.eye',
  'bot-cheek':   'bot.cheek',
};

let missing = [];
for (const cssVar of colorVarNames) {
  const jsKey = cssToJs[cssVar];
  if (!jsKey) {
    missing.push(`CSS var --${cssVar} has no mapping in check-token-parity.mjs`);
    continue;
  }
  const leafKey = jsKey.split('.').pop();
  if (!colorsJs.includes(leafKey + ':')) {
    missing.push(`--${cssVar} → ${jsKey} not found in colors.js`);
  }
}

if (missing.length > 0) {
  console.error('Token parity check FAILED:');
  missing.forEach(m => console.error('  ' + m));
  process.exit(1);
}

console.log(`Token parity OK — ${colorVarNames.length} color vars verified.`);
process.exit(0);
