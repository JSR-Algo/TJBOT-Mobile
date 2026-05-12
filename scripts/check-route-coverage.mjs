#!/usr/bin/env node
/**
 * Verifies every screen file in src/features has a matching route key in RootStackParamList.
 * Exits 1 and lists missing entries if any are found.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

function walkScreens(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkScreens(full));
    } else if (entry.endsWith('Screen.tsx') || entry.endsWith('Modal.tsx') || entry.endsWith('Overlay.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const featuresDir = join(root, 'src', 'features');
const screenFiles = walkScreens(featuresDir);

const routesPath = join(root, 'src', 'app', 'navigation', 'routes.ts');
const routesSrc = readFileSync(routesPath, 'utf8');

// Extract route keys from RootStackParamList
const routeKeys = new Set();
for (const match of routesSrc.matchAll(/^\s{2}(\w+):/gm)) {
  routeKeys.add(match[1]);
}

const missing = [];
for (const file of screenFiles) {
  const name = basename(file).replace(/\.(tsx)$/, '').replace(/Screen$|Modal$|Overlay$/, '');
  // Check if any route key contains the stem or equals it
  const stem = basename(file).replace(/\.(tsx)$/, '');
  const found = [...routeKeys].some(k => k === stem || k === name || stem.startsWith(k) || k === stem.replace('Screen', '').replace('Modal', '').replace('Overlay', '') || k.replace(/Screen$|Modal$|Overlay$/, '') === name);
  if (!found) {
    missing.push(stem);
  }
}

if (missing.length > 0) {
  console.error('check-route-coverage: missing routes for screens:');
  for (const m of missing) console.error('  -', m);
  process.exit(1);
}

const total = routeKeys.size;
console.log(`check-route-coverage: OK — ${screenFiles.length} screen files, ${total} routes registered`);
