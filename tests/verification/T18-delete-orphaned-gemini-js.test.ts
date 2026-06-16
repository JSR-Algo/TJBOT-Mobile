import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT, 'src');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

/**
 * Files and directories that must be deleted as part of T18.
 * The list includes the registry targets plus the dependent files that become
 * orphaned once those targets are removed (voice telemetry and the dev probe).
 */
const DELETED_PATHS = [
  'src/hooks/useGeminiConversation.ts',
  'src/hooks/use-streaming-transcript.ts',
  'src/components/gemini',
  'src/audio/PcmStreamPlayer.ts',
  'src/services/audio/PcmStreamPlayer.ts',
  'src/native/VoiceMic.ts',
  'src/native/VoiceSession.ts',
  'src/native/voice-session-events.ts',
  'src/services/ai/liveMessageAudio.ts',
  'src/state/voiceAssistantStore.ts',
  'src/services/observability/voice-telemetry.ts',
  'src/debug/voiceDebugProbe.ts',
];

/**
 * Exported identifiers and path fragments from the deleted Gemini layer.
 * No production source file should import or reference these after cleanup.
 */
const DELETED_SYMBOLS = [
  'useGeminiConversation',
  'SukaAvatar',
  'WaveVisualizer',
  'TranscriptPanel',
  'StatusIndicator',
  'ControlBar',
  'BigMicButton',
  'ParticleEffect',
  'VoiceMic',
  'VoiceSession',
  'voice-session-events',
  'PcmStreamPlayer',
  'liveMessageAudio',
  'voiceAssistantStore',
  'useVoiceAssistantStore',
  'useStreamingTranscript',
  'startVoiceTelemetry',
  'stopVoiceTelemetry',
  'jsErrorBreadcrumb',
  'startVoiceDebugProbe',
  'stopVoiceDebugProbe',
];

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function getSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Keep the scan inside production source only.
      if (entry.name === '__tests__' || entry.name === 'tests') {
        continue;
      }
      files = files.concat(getSourceFiles(fullPath));
      continue;
    }

    if (
      /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('T18: Delete the orphaned Gemini Live JS layer', () => {
  it('no longer contains the listed Gemini JS files or directories', () => {
    const stillPresent = DELETED_PATHS.filter(exists);
    expect(stillPresent).toEqual([]);
  });

  it('has no production source imports or references to deleted Gemini symbols', () => {
    const sourceFiles = getSourceFiles(SRC_DIR);
    const violations: Array<{ file: string; symbol: string }> = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');

      for (const symbol of DELETED_SYMBOLS) {
        // Path-like fragments (e.g. "voice-session-events") must not appear
        // in any import path or reference.
        if (symbol.includes('-') || symbol.includes('/')) {
          if (content.includes(symbol)) {
            violations.push({ file: path.relative(ROOT, file), symbol });
          }
          continue;
        }

        // Identifier-like symbols must not be used as whole words.
        const boundaryRegex = new RegExp(`\\b${symbol}\\b`);
        if (boundaryRegex.test(content)) {
          violations.push({ file: path.relative(ROOT, file), symbol });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not list @google/genai as a production dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(pkg.dependencies?.['@google/genai']).toBeUndefined();
  });
});
