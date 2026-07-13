import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ensureRuntimeEnv } from './ensure-runtime-env.mjs';

test('creates the runtime env from the template only when it is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tjbot-runtime-env-'));
  const templatePath = path.join(tempRoot, '__env__.example.ts');
  const runtimePath = path.join(tempRoot, '__env__.ts');

  try {
    fs.writeFileSync(templatePath, 'export const ENV = { value: "template" };\n');

    assert.equal(ensureRuntimeEnv({ runtimePath, templatePath }), true);
    assert.equal(
      fs.readFileSync(runtimePath, 'utf8'),
      'export const ENV = { value: "template" };\n',
    );

    fs.writeFileSync(runtimePath, 'local developer values\n');
    assert.equal(ensureRuntimeEnv({ runtimePath, templatePath }), false);
    assert.equal(fs.readFileSync(runtimePath, 'utf8'), 'local developer values\n');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
