import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

/**
 * Files that must be deleted as part of T13.
 *
 * Registry note: the task registry lists `useStreamingTranscript.ts` and
 * `useVoiceActivity.ts` in camelCase, but the actual source files use
 * kebab-case. This list reflects the real on-disk paths.
 */
const FILES_TO_DELETE = [
  'src/app/providers/AppProviders.tsx',
  'src/app/providers/ThemeProvider.tsx',
  'src/hooks/useOfflineSync.ts',
  'src/hooks/use-streaming-transcript.ts',
  'src/hooks/use-voice-activity.ts',
  'src/hooks/useLatencyBudget.ts',
  'src/components/robot/LatencyHud.tsx',
];

/**
 * Public symbols exported by the deleted files. If any production source file
 * still imports one of these, the cleanup is incomplete.
 */
const DELETED_SYMBOLS = [
  'AppProviders',
  'ThemeProvider',
  'useOfflineSync',
  'OfflineError',
  'useStreamingTranscript',
  'useVoiceActivity',
  'isSpeechFrame',
  'decodePcmBase64',
  'computeRms',
  'computeZcr',
  'useLatencyBudget',
  'LATENCY_TARGETS',
  'LatencyHud',
];

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('T13: delete dead providers and unused hooks/components', () => {
  test('all scoped dead files are removed from src/', () => {
    const stillPresent = FILES_TO_DELETE
      .map((relative) => path.join(PROJECT_ROOT, relative))
      .filter((absolute) => fs.existsSync(absolute));

    expect(stillPresent).toEqual([]);
  });

  test('no production source file imports a deleted symbol', () => {
    const sourceFiles = collectFiles(SRC_DIR).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    );

    const violations: string[] = [];
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const symbol of DELETED_SYMBOLS) {
        // Match either named imports (`import { X }`) or default/namespace
        // imports that mention the symbol.
        const importRegex = new RegExp(
          `import\\s+.*?\\b${symbol}\\b`,
          's',
        );
        if (importRegex.test(content)) {
          violations.push(
            `${path.relative(PROJECT_ROOT, file)} imports deleted symbol "${symbol}"`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
