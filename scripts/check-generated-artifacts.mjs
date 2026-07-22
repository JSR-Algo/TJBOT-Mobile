#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const forbidden = [
  { match: (path) => path === '.env', label: '.env' },
  { match: (path) => path.startsWith('ios/build/'), label: 'ios/build/' },
  { match: (path) => path.startsWith('ios/build-sim/'), label: 'ios/build-sim/' },
  { match: (path) => path.startsWith('ios/build-device/'), label: 'ios/build-device/' },
  { match: (path) => path.startsWith('output/maestro/'), label: 'output/maestro/' },
];

const checkTrackedTree = process.argv.includes('--tracked');
const gitArgs = checkTrackedTree
  ? ['ls-files', '-z']
  : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'];

let output;
try {
  output = execFileSync('git', gitArgs, { encoding: 'utf8' });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Generated-artifact guard could not inspect Git: ${message}`);
  process.exit(2);
}

const paths = output.split('\0').filter(Boolean);
const violations = paths.filter((path) => forbidden.some(({ match }) => match(path)));

if (violations.length > 0) {
  console.error('Generated-artifact guard blocked forbidden Git paths:');
  for (const path of violations) {
    console.error(`- ${path}`);
  }
  console.error('Keep local environment, Xcode caches, and Maestro screenshots outside Git.');
  process.exit(1);
}

const mode = checkTrackedTree ? 'tracked tree' : 'staged additions/modifications';
console.log(`Generated-artifact guard: ${mode} clean (${paths.length} paths checked).`);
