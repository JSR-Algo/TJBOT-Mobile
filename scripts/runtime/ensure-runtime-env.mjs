#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export function ensureRuntimeEnv({
  runtimePath = path.join(repoRoot, 'src', '__env__.ts'),
  templatePath = path.join(repoRoot, 'src', '__env__.example.ts'),
} = {}) {
  if (fs.existsSync(runtimePath)) return false;
  fs.copyFileSync(templatePath, runtimePath);
  return true;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const created = ensureRuntimeEnv();
  console.log(
    created
      ? 'Created ignored src/__env__.ts from the secret-free template.'
      : 'Kept existing ignored src/__env__.ts.',
  );
}
