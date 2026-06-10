/**
 * no-voice-timing-in-shared — TBOT custom ESLint rule.
 *
 * Enforces plan v2 §11.7 layer-isolation invariants for the realtime
 * voice stack (sys-16). Each ban exists because a real bug or design
 * decision would be undone if these constructs were re-introduced.
 *
 *   1. setTimeout / setInterval in src/state/, src/components/, src/screens/
 *      Reason: store and presentation layers must not own FSM-affecting
 *      timers. Hook owns timers via React useEffect cleanup contract.
 *      See plan v2 §6.3 + §3.2 timer table.
 *
 *   2. import 'react-native-live-audio-stream' anywhere in src/
 *      Reason: RNLAS path was dropped in P0-4 (no AEC, no layered
 *      audio session). Lint rule keeps it from sneaking back.
 *
 *   3. Platform.OS === 'android' / === 'ios' inside:
 *        src/state/, src/audio/, src/native/voice-session-events.ts
 *      Reason: cross-platform-shared layers must not branch on
 *      platform. Per-platform behavior lives in native modules.
 *
 *   4. setTimeout specifically in src/state/voiceAssistantStore.ts
 *      Reason: explicit re-emphasis — even if the directory glob in #1
 *      misses the file, this rule still fires. v1 store had a
 *      setTimeout(5000) ERROR auto-reset that contributed to fake-DONE
 *      bug class. P0-3 removed it; this keeps it removed.
 *
 *   5. transition() called inside setTimeout / setInterval callbacks
 *      anywhere in src/. Reason: hides a synthetic FSM transition
 *      behind a deferred timer — exactly the v1 anti-pattern.
 *
 * Surface: a single rule with multiple messageIds. ESLint reports the
 * matching messageId; tooling can disable individual messages without
 * losing the others.
 *
 * Test: tests/eslint-rules/no-voice-timing-in-shared.test.ts.
 */

'use strict';

/** Returns true when the file path matches one of the banned-timing dirs. */
function isInTimingBannedDir(filename) {
  const f = filename.replace(/\\/g, '/');
  return (
    f.includes('/src/state/') ||
    f.includes('/src/components/') ||
    f.includes('/src/screens/')
  );
}

/** Returns true when the file is the canonical voice-state store. */
function isVoiceStore(filename) {
  return filename.replace(/\\/g, '/').endsWith('/src/state/voiceAssistantStore.ts');
}

/** Returns true when the file path is in a platform-branching-banned dir/file. */
function isInPlatformBannedDir(filename) {
  const f = filename.replace(/\\/g, '/');
  return (
    f.includes('/src/state/') ||
    f.includes('/src/audio/') ||
    f.endsWith('/src/native/voice-session-events.ts')
  );
}

/** Returns true when the file is anywhere under src/. */
function isInSrc(filename) {
  return filename.replace(/\\/g, '/').includes('/src/');
}

/** Returns true when CallExpression's callee is a global timer (set{Timeout,Interval}). */
function isGlobalTimerCall(node, name) {
  return (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === name
  );
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Bans setTimeout/setInterval, RNLAS imports, Platform.OS branches, and timer-deferred transition() calls in shared voice layers.',
      recommended: false,
    },
    schema: [],
    messages: {
      noTimingInShared:
        '`{{name}}` is banned in shared voice layers (src/state/, src/components/, src/screens/). FSM-affecting timers belong in the hook via useEffect cleanup. (plan v2 §11.7, §6.3)',
      noTimingInStore:
        '`{{name}}` is banned in src/state/voiceAssistantStore.ts. The store must not schedule timers. (plan v2 §11.7, §6.3)',
      noRnlasImport:
        "Import of 'react-native-live-audio-stream' is banned. The RNLAS path was dropped in P0-4. (plan v2 §11.7, §4.2)",
      noPlatformBranch:
        '`Platform.OS === {{value}}` branching is banned in shared voice layers (src/state/, src/audio/, src/native/voice-session-events.ts). Cross-platform code must not branch on platform. (plan v2 §11.7, §3.4)',
      noTransitionInTimer:
        'transition() called inside a {{name}}() callback hides a deferred FSM transition. Drive transitions off Promise resolution or React useEffect cleanup. (plan v2 §11.7, §6.3)',
    },
  },

  create(context) {
    const filename = context.getFilename();

    return {
      CallExpression(node) {
        // ── #1 + #4: setTimeout / setInterval in banned scopes ──────
        for (const banned of ['setTimeout', 'setInterval']) {
          if (!isGlobalTimerCall(node, banned)) continue;

          if (isVoiceStore(filename)) {
            context.report({
              node: node.callee,
              messageId: 'noTimingInStore',
              data: { name: banned },
            });
          } else if (isInTimingBannedDir(filename)) {
            context.report({
              node: node.callee,
              messageId: 'noTimingInShared',
              data: { name: banned },
            });
          }

          // ── #5: transition() inside timer callback ────────────────
          // The first arg of the timer call is the callback. Walk it
          // for any `transition(...)` (either bare or member).
          //
          // EXEMPTION: src/hooks/ files own the FSM timer table per
          // plan v2 §6.3 (recoverable_auto_reset, interrupt_watchdog,
          // etc.) — those useEffect-cleanup-managed setTimeout blocks
          // legitimately call transition() from inside their callback,
          // and that IS the prescribed pattern. Firing the rule there
          // would force every legitimate hook timer to disable the
          // rule, defeating the purpose.
          //
          // Outside hooks: transition() in setTimeout is a code smell
          // (the v1 anti-pattern this lint rule exists to catch).
          if (!isInSrc(filename)) continue;
          if (filename.replace(/\\/g, '/').includes('/src/hooks/')) continue;

          const callback = node.arguments[0];
          if (!callback || (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')) {
            continue;
          }
          // Walk the callback body for CallExpressions whose callee is
          // identifier `transition` or member `.transition`. ESLint's
          // ESTree visitor doesn't recurse into nested CallExpressions
          // inside the same Program node, so we walk manually here.
          (function walk(n) {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'CallExpression') {
              const c = n.callee;
              if (
                (c.type === 'Identifier' && c.name === 'transition') ||
                (c.type === 'MemberExpression' &&
                  c.property &&
                  c.property.type === 'Identifier' &&
                  c.property.name === 'transition')
              ) {
                context.report({
                  node: n,
                  messageId: 'noTransitionInTimer',
                  data: { name: banned },
                });
              }
            }
            for (const key of Object.keys(n)) {
              if (key === 'parent' || key === 'loc' || key === 'range') continue;
              const child = n[key];
              if (Array.isArray(child)) child.forEach(walk);
              else if (child && typeof child === 'object' && child.type) walk(child);
            }
          })(callback.body);
        }
      },

      ImportDeclaration(node) {
        // ── #2: ban RNLAS import anywhere in src/ ───────────────────
        if (!isInSrc(filename)) return;
        if (node.source && node.source.value === 'react-native-live-audio-stream') {
          context.report({
            node: node.source,
            messageId: 'noRnlasImport',
          });
        }
      },

      BinaryExpression(node) {
        // ── #3: Platform.OS === 'android'/'ios' in banned layers ────
        if (!isInPlatformBannedDir(filename)) return;
        if (node.operator !== '===' && node.operator !== '!==') return;

        // Either side may be `Platform.OS`; the other should be a
        // string literal 'android' or 'ios'.
        function isPlatformOs(n) {
          return (
            n &&
            n.type === 'MemberExpression' &&
            n.object &&
            n.object.type === 'Identifier' &&
            n.object.name === 'Platform' &&
            n.property &&
            n.property.type === 'Identifier' &&
            n.property.name === 'OS'
          );
        }
        function asLiteral(n) {
          return n && n.type === 'Literal' ? n.value : null;
        }

        let value = null;
        if (isPlatformOs(node.left)) value = asLiteral(node.right);
        else if (isPlatformOs(node.right)) value = asLiteral(node.left);
        if (value !== 'android' && value !== 'ios') return;

        context.report({
          node,
          messageId: 'noPlatformBranch',
          data: { value: `'${value}'` },
        });
      },
    };
  },
};
