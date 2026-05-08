/**
 * RuleTester suite for the TBOT custom rule (plan v2 §11.7).
 *
 * Each invalid case asserts that a code construct in a specific
 * filename is reported with the right messageId. Each valid case
 * asserts that the same construct in a non-banned location is
 * accepted.
 *
 * RuleTester runs ESLint's parser inline; jest only wraps the
 * `it.each`/`describe` boilerplate so a regression in the rule fails
 * the suite at exactly the violation that broke.
 */

import { RuleTester } from 'eslint';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rule = require('../../eslint-rules/no-voice-timing-in-shared.js');

const REPO_ROOT = path.resolve(__dirname, '../..');

function srcFile(rel: string): string {
  return path.join(REPO_ROOT, 'src', rel);
}

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('no-voice-timing-in-shared', rule, {
  valid: [
    // setTimeout in src/hooks/ is fine — hooks are the timer-owners.
    {
      code: 'setTimeout(() => {}, 1000);',
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
    // setTimeout in src/utils/ — not on the banlist.
    {
      code: 'setTimeout(() => {}, 1000);',
      filename: srcFile('utils/delay.ts'),
    },
    // RNLAS import outside src/ (e.g. test fixture) — out of scope.
    {
      code: "import RNLAS from 'react-native-live-audio-stream';",
      filename: path.join(REPO_ROOT, 'tests/fixtures/legacy-stub.ts'),
    },
    // Platform.OS branch in src/hooks/ — allowed (hook owns
    // platform-aware orchestration).
    {
      code: "if (Platform.OS === 'ios') { /* ok */ }",
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
    // transition() outside any timer callback — fine.
    {
      code: 'function f() { transition("LISTENING"); }',
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
    // setTimeout in hooks where the callback does NOT call transition —
    // confirms the rule does not over-fire.
    {
      code: 'setTimeout(() => { logTelemetry("ok"); }, 100);',
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
    // EXEMPTION: src/hooks/ files own the FSM timer table per plan v2
    // §6.3 — transition() inside a hook-armed setTimeout is the
    // PRESCRIBED pattern (recoverable_auto_reset, interrupt_watchdog,
    // etc.). Rule must NOT fire here.
    {
      code: 'setTimeout(() => { store.getState().transition("LISTENING"); }, 400);',
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
    {
      code: 'setTimeout(() => { transition("IDLE"); }, 5000);',
      filename: srcFile('hooks/useGeminiConversation.ts'),
    },
  ],

  invalid: [
    // ── #1 setTimeout banned in src/state/ ──────────────────────────
    {
      code: 'setTimeout(() => {}, 1000);',
      filename: srcFile('state/voiceAssistantStore.ts'),
      errors: [{ messageId: 'noTimingInStore' }],
    },
    {
      code: 'setInterval(() => {}, 1000);',
      filename: srcFile('state/some-other-store.ts'),
      errors: [{ messageId: 'noTimingInShared' }],
    },
    // setTimeout in src/components/
    {
      code: 'setTimeout(() => {}, 50);',
      filename: srcFile('components/gemini/SukaAvatar.tsx'),
      errors: [{ messageId: 'noTimingInShared' }],
    },
    // setInterval in src/screens/
    {
      code: 'setInterval(() => {}, 1000);',
      filename: srcFile('screens/gemini/GeminiConversationScreen.tsx'),
      errors: [{ messageId: 'noTimingInShared' }],
    },

    // ── #2 RNLAS import banned anywhere in src/ ─────────────────────
    {
      code: "import RNLAS from 'react-native-live-audio-stream';",
      filename: srcFile('hooks/useGeminiConversation.ts'),
      errors: [{ messageId: 'noRnlasImport' }],
    },
    {
      code: "import { something } from 'react-native-live-audio-stream';",
      filename: srcFile('audio/PcmStreamPlayer.ts'),
      errors: [{ messageId: 'noRnlasImport' }],
    },

    // ── #3 Platform.OS branch banned in src/state/ ──────────────────
    {
      code: "if (Platform.OS === 'ios') { /* nope */ }",
      filename: srcFile('state/voiceAssistantStore.ts'),
      errors: [{ messageId: 'noPlatformBranch' }],
    },
    {
      code: "if (Platform.OS !== 'android') { /* nope */ }",
      filename: srcFile('audio/PcmStreamPlayer.ts'),
      errors: [{ messageId: 'noPlatformBranch' }],
    },
    {
      code: "if (Platform.OS === 'ios') { /* nope */ }",
      filename: srcFile('native/voice-session-events.ts'),
      errors: [{ messageId: 'noPlatformBranch' }],
    },
    // Reversed comparison still flagged.
    {
      code: "if ('ios' === Platform.OS) { /* nope */ }",
      filename: srcFile('state/voiceAssistantStore.ts'),
      errors: [{ messageId: 'noPlatformBranch' }],
    },

    // ── #5 transition() inside setTimeout callback ──────────────────
    // The rule exempts src/hooks/ (where useEffect-cleanup-managed
    // setTimeout calling transition() is the PRESCRIBED pattern per
    // plan §6.3). Outside hooks the v1 anti-pattern is still caught.
    //
    // Combo: transition() inside setTimeout in src/components/ — both
    // #1 (timing-in-shared) AND #5 (transition-in-timer) fire.
    {
      code: 'setTimeout(() => { store.transition("IDLE"); }, 1000);',
      filename: srcFile('components/gemini/StatusIndicator.tsx'),
      errors: [
        { messageId: 'noTimingInShared' },
        { messageId: 'noTransitionInTimer' },
      ],
    },
    // transition() inside setTimeout in src/screens/ — same pair.
    {
      code: 'setTimeout(() => { transition("IDLE"); }, 5000);',
      filename: srcFile('screens/gemini/GeminiConversationScreen.tsx'),
      errors: [
        { messageId: 'noTimingInShared' },
        { messageId: 'noTransitionInTimer' },
      ],
    },
  ],
});

describe('no-voice-timing-in-shared rule', () => {
  it('exports a valid ESLint rule object', () => {
    expect(rule.meta).toBeDefined();
    expect(rule.meta.messages).toBeDefined();
    expect(typeof rule.create).toBe('function');
  });

  it('declares messageIds for every ban category', () => {
    const expected = [
      'noTimingInShared',
      'noTimingInStore',
      'noRnlasImport',
      'noPlatformBranch',
      'noTransitionInTimer',
    ];
    for (const id of expected) {
      expect(rule.meta.messages[id]).toBeDefined();
    }
  });
});
