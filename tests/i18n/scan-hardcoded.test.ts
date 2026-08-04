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

function createProjectFixture(
  source: string,
  enCatalog: Record<string, string> = {},
  relPath = 'src/features/demo/DemoScreen.tsx',
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tbot-i18n-'));
  writeFixture(root, 'src/services/i18n/locales/en.json', JSON.stringify(enCatalog, null, 2));
  writeFixture(root, 'src/services/i18n/locales/vi.json', JSON.stringify(enCatalog, null, 2));
  writeFixture(root, 'scripts/i18n/.i18n-allowlist', 'TJBot\n');
  writeFixture(root, relPath, source);
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
          kind: 'jsx-attr-untranslated:accessibilityLabel',
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

  it('flags feature-copy fallbacks inside prompt expressions', () => {
    const root = createProjectFixture(`
      const payload = { prompt: '' };
      const step = {
        prompt: payload.prompt || 'Fallback instruction',
      };
      void step;
    `);
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'prop:prompt', text: 'Fallback instruction' }),
    ]));
  });

  it('checks only the source-copy argument of translation calls', () => {
    const root = createProjectFixture(`
      import { translateCopy } from '@/services/i18n/i18n';
      export const prompt = translateCopy('Known prompt', { persona: 'child' });
    `, { 'Known prompt': 'Known prompt' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.parsed).toEqual({ count: 0, findings: [] });
  });

  it('flags catalogued accessibility labels on native components that do not translate', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { TouchableOpacity } from 'react-native';

      export function DemoScreen() {
        return <TouchableOpacity accessibilityLabel="Pair robot now" />;
      }
    `, { 'Pair robot now': 'Pair robot now' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({
        kind: 'jsx-attr-untranslated:accessibilityLabel',
        text: 'Pair robot now',
      }),
    ]);
  });

  it('allows catalogued copy passed to a component that owns translation', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Button } from '@/components/Button';

      export function DemoScreen() {
        return <Button label="Pair robot now" onPress={() => undefined} />;
      }
    `, { 'Pair robot now': 'Pair robot now' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.parsed).toEqual({ count: 0, findings: [] });
  });

  it('flags indirect rendered state copy missing from the EN catalog', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { View } from 'react-native';
      import { Text } from '@/design-system/primitives';

      export function DemoScreen({ ready }: { ready: boolean }) {
        const status = ready ? 'Archive ready' : 'No archive requested';
        return <View><Text>{status}</Text></View>;
      }
    `);
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'jsx-expression', text: 'Archive ready' }),
        expect.objectContaining({ kind: 'jsx-expression', text: 'No archive requested' }),
      ]),
    );
  });

  it('flags catalogued template expressions that bypass runtime translation', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from '@/design-system/primitives';

      export function DemoScreen({ count }: { count: number }) {
        return <Text>{\`${'${count}'} lessons\`}</Text>;
      }
    `, { '{{value1}} lessons': '{{value1}} lessons' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({
        kind: 'translation-bypass:dynamic-expression',
        text: '{{value1}} lessons',
      }),
    ]);
  });

  it('flags indirect copy passed through a JSX copy attribute', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { TextInput } from 'react-native';

      export function DemoScreen() {
        const placeholder = 'Type the archive phrase';
        return <TextInput placeholder={placeholder} />;
      }
    `);
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({
        kind: 'translation-bypass:expression',
        text: 'Type the archive phrase',
      }),
    ]);
  });

  it('flags catalogued copy rendered by native Text without translation', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from 'react-native';

      export function DemoScreen() {
        return <Text>Account privacy</Text>;
      }
    `, { 'Account privacy': 'Account privacy' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'translation-bypass:text', text: 'Account privacy' }),
    ]);
  });

  it('flags catalogued copy when design-system translation is explicitly disabled', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from '@/design-system/primitives';

      export function DemoScreen() {
        return <Text i18n={false}>Account privacy</Text>;
      }
    `, { 'Account privacy': 'Account privacy' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'translation-bypass:text', text: 'Account privacy' }),
    ]);
  });

  it('allows native Text copy passed through the translation function', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from 'react-native';
      import { useAppLanguage } from '@/services/i18n/i18n';

      export function DemoScreen() {
        const { t } = useAppLanguage();
        return <Text>{t('Account privacy')}</Text>;
      }
    `, { 'Account privacy': 'Account privacy' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.parsed).toEqual({ count: 0, findings: [] });
  });

  it('flags missing catalog entries even when passed to the translation function', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from 'react-native';
      import { useAppLanguage } from '@/services/i18n/i18n';

      export function DemoScreen() {
        const { t } = useAppLanguage();
        return <Text>{t('Missing translated label')}</Text>;
      }
    `);
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'translation-call', text: 'Missing translated label' }),
    ]);
  });

  it('does not treat style properties or comparison operands as rendered copy', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { StyleSheet, Text } from 'react-native';
      import { useAppLanguage } from '@/services/i18n/i18n';

      export function DemoScreen({ role }: { role: string }) {
        const { t } = useAppLanguage();
        return <Text style={styles.label}>{role === 'parent' ? t('Parent') : t('Child')}</Text>;
      }

      const styles = StyleSheet.create({ label: { textTransform: 'uppercase' } });
    `, { Parent: 'Parent', Child: 'Child' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(0);
    expect(result.parsed).toEqual({ count: 0, findings: [] });
  });

  it('scans feature copy stored in TypeScript data modules', () => {
    const root = createProjectFixture(`
      export const card = { title: 'Missing module title' };
    `, {}, 'src/features/demo/copy.ts');
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'prop:title', text: 'Missing module title' }),
    ]);
  });

  it('scans user-facing error setters in hooks outside feature folders', () => {
    const root = createProjectFixture(`
      export function useDemoConnection() {
        const setError = (_message: string) => undefined;
        setError('Connection failed in the background');
      }
    `, {}, 'src/hooks/useDemoConnection.ts');
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'call:setError', text: 'Connection failed in the background' }),
    ]);
  });

  it('scans translation calls outside JSX and feature folders', () => {
    const root = createProjectFixture(`
      import { translateCopy } from '@/services/i18n/i18n';
      const key = 'Missing hook translation';
      export const message = translateCopy(key);
    `, {}, 'src/hooks/useDemoCopy.ts');
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual([
      expect.objectContaining({ kind: 'translation-call', text: 'Missing hook translation' }),
    ]);
  });

  it('scans component copy maps and state error messages', () => {
    const root = createProjectFixture(`
      const status = { label: 'Waiting for a response' };
      const state = { errorMessage: 'Audio stopped unexpectedly' };
      export { status, state };
    `, {}, 'src/components/demo/status.ts');
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'prop:label', text: 'Waiting for a response' }),
      expect.objectContaining({ kind: 'prop:errorMessage', text: 'Audio stopped unexpectedly' }),
    ]));
  });

  it('flags uncatalogued single-word UI copy and template fallbacks', () => {
    const root = createProjectFixture(`
      import React from 'react';
      import { Text } from '@/design-system/primitives';
      import { translateTemplate } from '@/services/i18n/i18n';

      export function DemoScreen() {
        return (
          <>
            <Text>Step</Text>
            <Text>{translateTemplate('Carrier {{tracking}}', { tracking: 'pending' })}</Text>
          </>
        );
      }
    `, { 'Carrier {{tracking}}': 'Carrier {{tracking}}' });
    roots.push(root);

    const result = runScanner(root);

    expect(result.status).toBe(1);
    expect(result.parsed.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'Step' }),
      expect.objectContaining({ text: 'pending' }),
    ]));
  });
});
