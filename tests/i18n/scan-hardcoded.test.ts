import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type ScanFinding = {
  file: string;
  kind: string;
  text: string;
};

type ScanResult = {
  count: number;
  findings: ScanFinding[];
};

const scannerPath = path.join(process.cwd(), 'scripts/i18n/scan-hardcoded.mjs');

function writeFixture(root: string, relPath: string, contents: string): void {
  const absPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, contents);
}

function createProjectFixture(source: string, enCatalog: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tbot-i18n-'));
  writeFixture(root, 'src/services/i18n/locales/en.json', JSON.stringify(enCatalog, null, 2));
  writeFixture(root, 'src/services/i18n/locales/vi.json', JSON.stringify(enCatalog, null, 2));
  writeFixture(root, 'scripts/i18n/.i18n-allowlist', 'TJBot\n');
  writeFixture(root, 'src/features/demo/DemoScreen.tsx', source);
  return root;
}

function isScanFinding(value: unknown): value is ScanFinding {
  if (typeof value !== 'object' || value === null) return false;
  const maybeFinding = value as Record<string, unknown>;
  return typeof maybeFinding.file === 'string'
    && typeof maybeFinding.kind === 'string'
    && typeof maybeFinding.text === 'string';
}

function isScanResult(value: unknown): value is ScanResult {
  if (typeof value !== 'object' || value === null) return false;
  const maybeResult = value as Record<string, unknown>;
  return typeof maybeResult.count === 'number'
    && Array.isArray(maybeResult.findings)
    && maybeResult.findings.every(isScanFinding);
}

function runScanner(root: string): { status: number | null; parsed: ScanResult } {
  const result = spawnSync(process.execPath, [scannerPath, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const parsed: unknown = JSON.parse(result.stdout);

  if (!isScanResult(parsed)) {
    throw new Error(`Unexpected scanner JSON: ${result.stdout}`);
  }

  return {
    status: result.status,
    parsed,
  };
}

describe('scan-hardcoded i18n gate', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags direct accessibility labels missing from the EN catalog', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { TouchableOpacity, Text } from 'react-native';

      export function DemoScreen() {
        return (
          <TouchableOpacity accessibilityLabel="Pair robot now">
            <Text>{'auth.login.title'}</Text>
          </TouchableOpacity>
        );
      }
    `);
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'src/features/demo/DemoScreen.tsx',
          kind: 'jsx-attr:accessibilityLabel',
          text: 'Pair robot now',
        }),
      ]),
    );
  });

  it('flags feature copy object properties missing from the EN catalog', () => {
    const root = createProjectFixture(`
      const cards = [
        { title: 'Known heading', body: 'Missing body copy' },
      ];

      export function DemoScreen() {
        return cards[0].body;
      }
    `, { 'Known heading': 'Known heading' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'src/features/demo/DemoScreen.tsx',
          kind: 'prop:body',
          text: 'Missing body copy',
        }),
      ]),
    );
    expect(result.parsed.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Known heading' }),
      ]),
    );
  });

  it('allows accessibility labels already present in the EN catalog', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { TouchableOpacity } from 'react-native';

      export function DemoScreen() {
        return <TouchableOpacity accessibilityLabel="Pair robot now" />;
      }
    `, { 'Pair robot now': 'Pair robot now' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.parsed).toEqual({ count: 0, findings: [] });
  });
});
