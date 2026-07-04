/* TJBOT_HUB · surface catalog for the Mobile Redesign Proposals Hub.
 * Source of truth (audit + plan):
 *   docs/design-references/redesign-2026/AUDIT-SUMMARY.md
 *   docs/design-references/redesign-2026/REDESIGN-PLAN.md
 *   docs/design-references/redesign-2026/mascot/ROBOT-PLACEMENT.md
 *   src/navigation/routes.ts           (134+ route names)
 *   DESIGN.md §4, §7, §8; BEHAVIOR.md §8
 *
 * Each surface:
 *   { id, num, lane, title, route,
 *     feature (src/ source path), wrong[5], proposed[5], authority[3],
 *     mockHTML (inline lane-correct markup),
 *     captured (bool), capture (path), captureEnv {udid, waitMs, iso},
 *     captureBlocker (string if not captured) }
 *
 * Three lanes: CHILD (Garden Blue) | PARENT (Wispr Flow) | SHARED (dark overlay).
 */

window.TJBOT_HUB = {
  kitVersion: 'redesign-2026 v0.2',
  captureEnv: {
    udid: '471AB4FC-509E-4F37-8A57-97D7403FB3CA', // iPad Pro 13-inch (M5), iOS 26.3
    platform: 'iPad Pro 13-inch (M5), iOS 26.3 simulator',
    isoDate: '2026-06-29T08:00:00Z',
  },
  surfaces: [

    /* ============================================================
     * CHILD LANE · Garden Blue storybook (DESIGN.md §7)
     * ============================================================ */

    {
      id: 'home-hub',
      num: 'C-01', lane: 'CHILD',
      title: 'Home Hub (4-card)',
      route: '/#/HomeHub',
      feature: 'src/features/home/screens/HomeHubScreen.tsx',
      captured: true,
      capture: 'captures/home-hub.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Hero card and 4 secondary buttons compete for attention; no clear primary',
        'Streak/XP ribbon sits above hero but uses raw opacity for connection state (color-only)',
        'Quick-action icons (🤖 emoji) below hero lack ≥44px touch target guarantee',
        'Cat-mascot position is not part of any token contract (varies per build)',
        'Loading state is not designed; skeleton flashes a white block',
      ],
      proposed: [
        'One primary CTA ("Start today’s lesson") in coral pill, full-width',
        'Status ribbon (streak / XP / device) uses --c-mint-soft chip + lucide icon + text',
        'Mascot wired via <RobotImage variant="body"> at kit-defined hero spot',
        'Lesson-completion chip earned/badged states per BEHAVIOR.md §5',
        'Skeleton paints the actual HomeHub layout (no white flash)',
      ],
      authority: ['DESIGN.md §7 (child low-density)', 'GOOD-DESIGN-PRINCIPLES.md §1', 'ENGLISH_LEARNING.md §7'],
      mockHTML:
        '<div class="ph-frame">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<span class="ph-pill">5-day streak</span>' +
            '<span class="ph-pill">340 XP</span>' +
          '</div>' +
          '<div class="ph-card">' +
            '<div class="ph-title">Today with TeeBot</div>' +
            '<div class="ph-sub">Barn animals · Level 2</div>' +
            '<div class="ph-cta">Start lesson</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
            '<div style="text-align:center"><div style="height:42px;background:var(--c-sky-soft);border-radius:12px"></div><small>Course</small></div>' +
            '<div style="text-align:center"><div style="height:42px;background:var(--c-mint-soft);border-radius:12px"></div><small>Review</small></div>' +
            '<div style="text-align:center"><div style="height:42px;background:var(--c-sun-soft);border-radius:12px"></div><small>Progress</small></div>' +
            '<div style="text-align:center"><div style="height:42px;background:var(--c-coral-soft);border-radius:12px"></div><small>Robot</small></div>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'lesson-player',
      num: 'C-02', lane: 'CHILD',
      title: 'Lesson Player — landscape fullscreen video',
      route: '/#/LessonPlayer/RobotFullscreenLesson',
      feature: 'src/features/lessonDemo/screens/RobotFullscreenLessonScreen.tsx',
      captured: true,
      capture: 'captures/lesson-player.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'No expo-screen-orientation lock; rotates with device (BEHAVIOR.md §8 violated)',
        'Scene root is not absoluteFillObject; video capped at 38% of portrait height',
        'Layout is a portrait overlay stack; no 62/38 split (BEHAVIOR.md §8)',
        'Tab bar is shown (BEHAVIOR.md §8 forbids it inside lesson)',
        'Back/Next buttons live in a dedicated footer; should float inside caption',
      ],
      proposed: [
        'Lock to LANDSCAPE on enter, restore PORTRAIT on leave (expo-screen-orientation)',
        'Scene layer uses absoluteFillObject; video fills screen edge to edge',
        '62 / 38 split: media left, content panel right (tablet); portrait fallback stacks',
        'Hide tab bar via display:none during lesson',
        'Floating caption panel: text ≤36% of screen height + primary action as pill',
      ],
      authority: ['BEHAVIOR.md §8 (lesson landscape)', 'DESIGN.md §7 (visual-first landscape)', 'GOOD-DESIGN-PRINCIPLES.md §3'],
      mockHTML:
        '<div style="background:linear-gradient(135deg,#0c1326,#070b18);color:#f5f7ff;border-radius:18px;padding:14px;height:380px;display:flex;align-items:flex-end">' +
          '<div style="width:62%;height:100%;background:radial-gradient(circle at 60% 50%,#1d3a5e,#070b18);border-radius:14px;display:flex;align-items:center;justify-content:center">' +
            '<div style="text-align:center">' +
              '<div style="width:120px;height:120px;border-radius:50%;background:#7ee8ff;margin:0 auto"></div>' +
              '<div style="margin-top:8px;font-weight:800">Barn · Level 2</div>' +
            '</div>' +
          '</div>' +
          '<div style="flex:1;padding-left:14px">' +
            '<div style="background:rgba(11,13,16,0.65);border-radius:14px;padding:10px">' +
              '<div style="font-weight:800">Say "moo"!</div>' +
              '<div style="font-size:11px;opacity:.8">Listen · then speak</div>' +
              '<div style="margin-top:8px;display:flex;gap:6px">' +
                '<span class="ph-pill" style="background:rgba(255,255,255,.1);color:#fff;border:0">Repeat</span>' +
                '<span class="ph-pill" style="background:#ff5555;color:#fff;border:0">Speak</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'lesson-pick',
      num: 'C-03', lane: 'CHILD',
      title: 'Lesson Picker — curated happy-sad/red-blue/cat-dog',
      route: '/#/LessonPick',
      feature: 'src/features/lessonDemo/screens/LessonPickScreen.tsx',
      captured: true,
      capture: 'captures/lesson-pick.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'List uses raw emoji + sized inline cards; no shared card primitive',
        'Card title color hardcoded across lessons; breaks token rule',
        '"Curated by TeeBot" badge uses opacity only; no text/icon for state',
        'No empty state when content is offline',
        'Filter chip row above list overflows on smaller iPad widths',
      ],
      proposed: [
        'Cards use <LessonCard> kit compound (defined in referenceTheme)',
        'Badge uses --c-mint-soft + "Curated" text + lucide icon',
        'Beach state (offline) shows NetworkErrorScreen with safe-fallback lesson',
        'Filter chips become scroll-snap horizontal list (iPad-safe)',
        'Title uses --text-heading-md token; matching line-height 1.25',
      ],
      authority: ['DESIGN.md §7', 'GOOD-DESIGN-PRINCIPLES §1', 'ENGLISH_LEARNING.md §6'],
      mockHTML:
        '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">' +
          ['Happy / Sad','Red / Blue','Cat / Dog','Big / Small'].map(function (t) { return '\
            <div class="ph-card" style="margin:0">\
              <div style="height:54px;background:var(--c-sky-soft);border-radius:12px;margin-bottom:6px"></div>\
              <div class="ph-title">' + t + '</div>\
              <div class="ph-sub">3 min · Curated</div>\
            </div>'; }).join("") +
        '</div>',
    },

    {
      id: 'lesson-active',
      num: 'C-04', lane: 'CHILD',
      title: 'Lesson Active — voice + transcript + barge-in',
      route: '/#/LessonSession/RobotListening',
      feature: 'src/features/lesson-session/screens/RobotListeningScreen.tsx',
      captured: false,
      captureBlocker: 'Requires voice session: backend WS to be live + user speaking into mic. iOS Simulator mic input unreliable; needs physical device or post-tap capture.',
      wrong: [
        'Mic state shown by color alone; red dot, no text label',
        'Transcript placeholder "I’m listening…" stays even after 4s of silence',
        'Barge-in button is inline; does not match FAB pattern',
        'No fallback when WS disconnects (parent-StoppedScreen not opened automatically)',
        'Captured/retry/skip with-reason trio not all visible on the same panel',
      ],
      proposed: [
        'Mic chip uses "Listening" + lucide Mic icon + dot; meets colorblind safe rule',
        'Silence state graduates to SilenceScreen (BEHAVIOR.md §4)',
        'Barge-in as FAB; primary action as pill inside caption',
        'Disconnect auto-routes to ReconnectingScreen then to SafeFallback lesson',
        'Listen / Repeat / Skip (with reason) all reachable from the caption panel',
      ],
      authority: ['BEHAVIOR.md §4 (state breadcrumb)', 'GOOD-DESIGN-PRINCIPLES §2', 'BEHAVIOR.md §5 (skip with reason)'],
      mockHTML:
        '<div class="ph-frame">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:var(--c-coral);animation:pulse 1.2s infinite"></div>' +
            '<span style="font-weight:800">Listening</span>' +
          '</div>' +
          '<div class="ph-card">' +
            '<div style="font-weight:800;color:var(--c-ink)">"moo"…</div>' +
            '<div style="font-size:12px;color:var(--c-ink-soft);margin-top:4px">You said: mooo · 0.82 confidence</div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:6px">' +
            '<button class="ph-pill" style="border:0">Repeat</button>' +
            '<button class="ph-pill" style="border:0;background:var(--c-coral-soft);color:var(--c-coral)">Skip</button>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'lesson-complete',
      num: 'C-05', lane: 'CHILD',
      title: 'Lesson Completion — celebration',
      route: '/#/LessonDone',
      feature: 'src/features/lesson-session/screens/LessonDoneScreen.tsx',
      captured: false,
      captureBlocker: 'Awaiting capture after CelebrationScreen re-merge; honoring reduced-motion default per audit #6.',
      wrong: [
        'No confetti / badge-reveal / micro-interaction (audit #6, 38+ screens)',
        'Reduced-motion preference not respected (animations do not auto-disable)',
        'Reward copy can leak weak progress; risk of shame phrasing',
        'TeeBot success pose not kit-bound; varies per build',
        'Primary CTA ("Next lesson") competes with secondary ("Practice again")',
      ],
      proposed: [
        'Stars/badges fade+scale-in 300–400ms; respect prefers-reduced-motion',
        'Reward copy from ENGLISH_LEARNING.md §7: effort-attributed, parent-safe',
        'TeeBot success pose via <RobotExpression name="celebrate">',
        'One primary action (Next lesson), one secondary (Practice again) lower-contrast',
        'Adds a 6-leaf "garden gets watered" beacon when personality_signal is positive',
      ],
      authority: ['ENGLISH_LEARNING.md §7 (reward contract)', 'GOOD-DESIGN-PRINCIPLES §6', 'DESIGN.md §7 (Personality Garden)'],
      mockHTML:
        '<div class="ph-frame" style="text-align:center">' +
          '<div style="font-size:48px;font-weight:900;color:var(--c-mint)">+5 ★</div>' +
          '<div style="font-weight:800;color:var(--c-ink);margin-top:6px">You moo’d so loud the barn woke up!</div>' +
          '<div style="font-size:12px;color:var(--c-ink-soft);margin-top:4px">Curiosity Sprout just bloomed.</div>' +
          '<div class="ph-cta" style="margin-top:14px">Next lesson</div>' +
        '</div>',
    },

    {
      id: 'pairing',
      num: 'C-06', lane: 'CHILD',
      title: 'BLE Pairing Search',
      route: '/#/Pair/Search',
      feature: 'src/features/device/screens/PairSearchScreen.tsx',
      captured: false,
      captureBlocker: 'BLE UUID seam mismatch (mobile BluFi vs firmware 6F0A0001 service); no current device can pair via mobile BLE path. Awaiting firmware coordination.',
      wrong: [
        'BLE UUIDs in src/services/ble/config.ts (BluFi) do not match firmware (6F0A0001 service)',
        'Spinner is color-only; no scanning-count text',
        'Allow-list prefixes ["TBot","TBOT","TBT","TJBot"] are hardcoded; no copy explaining',
        'No cancellation confirmation; accidental back leaves orphan scan task',
        'No fallback when user denies location permission',
      ],
      proposed: [
        'Pairing paths reconciled: BluFi for legacy/factory, 6F0A0001 for current firmware (BLE guard escalated)',
        'Spinner dot + "Scanning · N found" text label, ≥44px tap target',
        'Help link below allow-list explains device naming',
        'Cancel needs confirmation modal per BEHAVIOR.md §5',
        'Permission-denied path routes to PairOfflineScreen (safe-fallback)',
      ],
      authority: ['AGENTS.md §5/§5a (BLE escalation rule)', 'BEHAVIOR.md §5', 'GOOD-DESIGN-PRINCIPLES §3'],
      mockHTML:
        '<div class="ph-frame" style="text-align:center">' +
          '<div style="font-weight:800;color:var(--c-ink)">Looking for your TeeBot…</div>' +
          '<div style="font-size:12px;color:var(--c-ink-soft)">3 devices nearby</div>' +
          '<div style="margin-top:18px">' +
            ['TBot-ABCD','TJBot-EFGH','TBT-WXYZ'].map(function (n) { return '\
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--c-line);border-radius:14px;margin-bottom:8px">\
                <span style="font-weight:700;color:var(--c-ink)">' + n + '</span>\
                <span style="font-size:11px;color:var(--c-ink-soft)">−58 dBm</span>\
              </div>'; }).join("") +
          '</div>' +
        '</div>',
    },

    /* ============================================================
     * PARENT LANE · Wispr Flow operational (DESIGN.md §8)
     * ============================================================ */

    {
      id: 'parent-overview',
      num: 'P-01', lane: 'PARENT',
      title: 'Parent Dashboard',
      route: '/#/ParentSummary',
      feature: 'src/features/parent/screens/ParentSummaryScreen.tsx',
      captured: true,
      capture: 'captures/parent-overview.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Background uses --parent-bg-0; some sections still on legacy dark mode (3-palette coexistence)',
        'KPIs use raw inline typography; no --text-heading-md token',
        'CourseInsightDashboard is great but lacks per-course "Why this course?" descriptor',
        'Empty state for new parents is a generic white page',
        'No reduced-motion check on the streak ring (audit #6)',
      ],
      proposed: [
        'Single source: <ParentScroll> PA palette tokens (already shipped)',
        'Apply typography tokens (--text-heading-md, --text-body) across all parent surfaces',
        'Add "Why this course?" hint card per course chip; matches ENGLISH_LEARNING.md §7',
        'Empty state per DESIGN.md §8.5 (centered illustration, body ≤28ch)',
        'Streak ring respects prefers-reduced-motion (static fallback)',
      ],
      authority: ['DESIGN.md §8 (parent lane)', 'ENGLISH_LEARNING.md §7 (parent summary)', 'GOOD-DESIGN-PRINCIPLES §4'],
      mockHTML:
        '<div>' +
          '<div class="pa-card">' +
            '<div class="pa-h">This week</div>' +
            '<div class="pa-stat">12 <span style="font-size:14px;color:var(--p-ink-2)">lessons</span></div>' +
            '<div class="pa-sub" style="margin-top:6px">3 of 5 child profiles used</div>' +
            '<div class="pa-cta">Open today’s review</div>' +
          '</div>' +
          '<div class="pa-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<div style="font-weight:600;color:var(--p-ink)">Quiet hours</div>' +
              '<div class="on"></div>' +
            '</div>' +
            '<div class="pa-toggle"><span style="color:var(--p-ink-1)">Auto-summarize weekly</span><div class="on"></div></div>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'parent-today',
      num: 'P-02', lane: 'PARENT',
      title: 'Parent Today — child course insight',
      route: '/#/ParentToday',
      feature: 'src/features/parent/screens/ParentTodayScreen.tsx',
      captured: true,
      capture: 'captures/parent-today.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Course insight cards stack vertically; no lane hierarchy',
        'Color of "improving" trend uses raw green (audit #1 hardcoded colors)',
        'Insight text sometimes longer than 28ch line-length on iPad mini',
        '"Ask TeeBot" link is a separate affordance; not part of card',
        'Pronunciation trend block not visible without scrolling on 11-inch iPad',
      ],
      proposed: [
        'Course insight hero (--parent-cream); 24px radius per DESIGN.md §8.3',
        'Success uses --p-success; warning --p-warning; danger --p-danger (no raw hex)',
        'Line-length clamp 28ch; center on iPad mini using horizontal card padding',
        'Move "Ask TeeBot" into card footer; cleanup redundant CTA',
        'Pronunciation trend pinned at top of card (no scroll)',
      ],
      authority: ['DESIGN.md §8.3 (cards)', 'DESIGN.md §8.4 (line-length)', 'GOOD-DESIGN-PRINCIPLES §5'],
      mockHTML:
        '<div>' +
          '<div class="pa-card">' +
            '<div class="pa-h" style="font-size:22px">Minh · Level 2</div>' +
            '<div class="pa-sub" style="margin-top:6px">Today: barn-animals · 3 of 5 steps</div>' +
            '<div style="margin-top:10px;padding:8px 12px;background:var(--p-cream);border-radius:12px;font-size:13px;color:var(--p-ink-1)">' +
              '<b style="color:var(--p-ink)">Why this course:</b> Animals + simple verbs fit her short-attention span.' +
            '</div>' +
            '<div style="margin-top:10px;display:flex;gap:6px">' +
              '<span class="pa-chip">+12% pronunciation</span>' +
              '<span class="pa-chip">5-day streak</span>' +
            '</div>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'parent-history',
      num: 'P-03', lane: 'PARENT',
      title: 'Parent History',
      route: '/#/ParentHistory',
      feature: 'src/features/parent/screens/ParentHistoryScreen.tsx',
      captured: true,
      capture: 'captures/parent-history.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Date range picker is iOS native; inconsistent with kit chrome',
        'Lesson list rows mix kid-side emoji with parent-side chip',
        'Detail row expand uses hardcoded chevron color',
        'No export-of-history affordance (audit: parent exports missing in 6 screens)',
        'Pagination/load-more state not styled',
      ],
      proposed: [
        'Date range uses Wispr Flow card (--parent-card, border-radius 24)',
        'Rows use one rule (--parent-line); no kid emoji bleed into parent lane',
        'Chevron uses --p-ink-2 token',
        'Export → POST /v1/account/export per BEHAVIOR.md §5',
        'Load-more pill uses parent charcoal pill style',
      ],
      authority: ['DESIGN.md §8.3 (rows)', 'BEHAVIOR.md §5', 'GOOD-DESIGN-PRINCIPLES §4'],
      mockHTML:
        '<div>' +
          '<div class="pa-card" style="padding:0">' +
            ['Mon · 9:12 AM','Sun · 4:30 PM','Sat · 11:05 AM'].map(function (d, i) { return '\
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;' + (i?'border-top:1px solid var(--p-line);':'') + '">\
                <span style="color:var(--p-ink)">Lesson · Barn animals</span>\
                <span style="color:var(--p-ink-2);font-size:12px">' + d + '</span>\
              </div>'; }).join("") +
          '</div>' +
          '<div class="pa-cta" style="margin-top:14px">Export 30 days</div>' +
        '</div>',
    },

    {
      id: 'parent-safety',
      num: 'P-04', lane: 'PARENT',
      title: 'Parent Safety / Lockout',
      route: '/#/ParentSafety',
      feature: 'src/features/parent/screens/ParentSafetyScreen.tsx',
      captured: false,
      captureBlocker: 'PIN elevation requires physical interaction (SecureStore keychain), documented in AGENT_CONTEXT as human-touch surface.',
      wrong: [
        'Toggle rows use raw tint; not chip-with-text',
        '"Lock now" CTA same weight as "Save changes"',
        'Auto-lock timer uses segmented control; not consistent with kit chrome',
        'Safety events log uses monospace but raw color',
        'No "What counts as a safety event?" help text',
      ],
      proposed: [
        'Toggle rows per DESIGN.md §8.3 (52px height, leading icon 20px, system toggle)',
        'Lock-now is primary CTA (charcoal pill); save is ghost link',
        'Auto-lock uses segmented chip row (Wispr Flow style)',
        'Safety log uses --p-ink-2 for non-critical; --p-danger for lockouts',
        'Help text inline below section header (caption, --p-ink-2)',
      ],
      authority: ['DESIGN.md §8.3 (toggles)', 'BEHAVIOR.md §5 (safety confirmation)', 'ENGLISH_LEARNING.md §7'],
      mockHTML:
        '<div class="pa-card" style="padding:0">' +
          [
            ['Block mic off-hours', true],
            ['Auto-lock after 30 min', false],
            ['Require PIN for purchase', true],
          ].map(function (row, i) {
            var on = row[1];
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;' +
              (i?'border-top:1px solid var(--p-line);':'') + '">' +
              '<span style="color:var(--p-ink)">' + row[0] + '</span>' +
              '<div class="on" style="' + (on?'':'background:var(--p-card-2);') + '"></div>' +
            '</div>';
          }).join("") +
        '</div>',
    },

    {
      id: 'parent-settings',
      num: 'P-05', lane: 'PARENT',
      title: 'Parent Settings',
      route: '/#/ParentSettings',
      feature: 'src/features/parent/screens/ParentSettingsScreen.tsx',
      captured: true,
      capture: 'captures/parent-settings.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Inline #fff hardcoded for language pills (audit #1)',
        'Section headers caption-style but use raw --p-ink-2',
        'Switch rows sit in a card without 1px top dividers between rows',
        'Sign out is destructive; rendered as plain text link, not parent-danger style',
        'Subscription section missing per audit (5 P0 screens)',
      ],
      proposed: [
        'Language pills use --parent-card-2 (no #fff)',
        'Caption uses --p-ink-2 token; spacing per DESIGN.md §8.3',
        'Rows separated by 1px --parent-line',
        'Sign out uses --parent-danger + confirmation modal per BEHAVIOR.md §5',
        'Subscription section: Account Overview cream card per DESIGN.md §8.5',
      ],
      authority: ['DESIGN.md §8.3 (list rows)', 'BEHAVIOR.md §5 (destructive confirm)', 'GOOD-DESIGN-PRINCIPLES §4'],
      mockHTML:
        '<div class="pa-card" style="padding:0">' +
          [
            'Language · English',
            'Notifications',
            'Manage subscription',
            'Privacy & data',
            'Sign out',
          ].map(function (label, i) {
            var isLast = i === 4;
            var danger = isLast;
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;' +
              (i?'border-top:1px solid var(--p-line);':'') + '">' +
              '<span style="color:' + (danger?'var(--p-danger)':'var(--p-ink)') + '">' + label + '</span>' +
              '<span style="color:var(--p-ink-2)">›</span>' +
            '</div>';
          }).join("") +
        '</div>',
    },

    {
      id: 'parent-diagnostic',
      num: 'P-06', lane: 'PARENT',
      title: 'Parent Diagnostic Log',
      route: '/#/ParentDiagnosticLog',
      feature: 'src/features/parent/screens/ParentDiagnosticLogScreen.tsx',
      captured: false,
      captureBlocker: 'Needs fresh capture; depends on diagnostic relay path remaining un-redirected.',
      wrong: [
        'Diagnostic copy does not show trace IDs per BEHAVIOR.md §3',
        'No copy for offline-collect vs offline-send distinction',
        'No way to share log via standard share-sheet',
        'Color-only severity indicator',
        'No confirmation when sharing; risk of leaking child activity',
      ],
      proposed: [
        'Show Sentry trace ID + correlation ID on SYSTEM_ERROR rows',
        'Distinguish collected-only vs sent with icon + caption',
        'Share uses OS share sheet; preview masks child-display names',
        'Severity uses --p-danger / --p-warning / --p-ink-2 + icon + text',
        'Confirmation modal per BEHAVIOR.md §5 + child-data scope checkbox',
      ],
      authority: ['BEHAVIOR.md §3 (error taxonomy)', 'BEHAVIOR.md §5', 'GOOD-DESIGN-PRINCIPLES §4'],
      mockHTML:
        '<div class="pa-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span class="pa-chip" style="background:#FEE2E2;color:var(--p-danger)">SYSTEM_ERROR</span>' +
            '<span style="color:var(--p-ink-2);font-size:12px">trace 3af4…</span>' +
          '</div>' +
          '<div class="pa-sub" style="margin-top:8px;font-family:SF Mono,ui-monospace,monospace;font-size:12px">backend /v1/auth/login · 502</div>' +
          '<div class="pa-cta" style="margin-top:14px">Share log</div>' +
        '</div>',
    },

    /* ============================================================
     * SHARED LANE · dark overlay / diagnostics
     * ============================================================ */

    {
      id: 'age-gate',
      num: 'S-01', lane: 'SHARED',
      title: 'Age Gate',
      route: '/#/Age',
      feature: 'src/navigation/AgeScreen.tsx (boots from App.tsx age gate)',
      captured: true,
      capture: 'captures/age-gate.png',
      captureEnv: { waitMs: 60000 },
      wrong: [
        'Background uses dark mode #030611 per DESIGN.md §4 (legacy)',
        'Coral CTA "I am the parent" has no role distinction from kid path',
        'Hidden SecureStore key `age_answer_completed` is undocumented in surface',
        'No "I am the kid" affordance on shared parental devices (COPPA risk)',
        'Animation on tile expand does not respect reduced-motion',
      ],
      proposed: [
        'Use lane-correct background: --c-bg for child, --p-bg for parent (per ResolvedRole)',
        'Parent path uses --parent-blush hero; kid path uses --c-cream',
        'Document safe-store key in BEHAVIOR.md §4 state breadcrumb',
        'Show both affordances when COPPA token absent; confirm role each session',
        'Tile expand animation honors prefers-reduced-motion',
      ],
      authority: ['DESIGN.md §4 / §8 cross-lane', 'BEHAVIOR.md §4', 'GOOD-DESIGN-PRINCIPLES §6'],
      mockHTML:
        '<div style="background:linear-gradient(180deg,#CFEFF4,#BCE7F0);border-radius:18px;padding:22px;text-align:center">' +
          '<div style="font-weight:900;color:#1C1C1E;font-size:22px;margin-bottom:8px;font-family:Georgia,serif">Almost there.</div>' +
          '<div style="color:#3A3A3C;font-size:13px;margin-bottom:14px">Just one thing before we start.</div>' +
          '<div style="display:flex;gap:8px;justify-content:center">' +
            '<button class="ph-pill" style="border:0;background:#FF6F61;color:#fff">I’m a grown-up</button>' +
            '<button class="ph-pill" style="border:0">I’m a kid</button>' +
          '</div>' +
        '</div>',
    },

    {
      id: 'coppa-consent',
      num: 'S-02', lane: 'SHARED',
      title: 'COPPA Parent Consent',
      route: '/#/CoppaConsent',
      feature: 'src/features/auth/screens/CoppaScreen.tsx (legal copy is HANDOFF-OWNED)',
      captured: false,
      captureBlocker: 'COPPA copy in src/features/auth/screens/CoppaScreen.tsx + onboarding/screens/CoppaConsentScreen.tsx is HANDOFF-OWNED (AGENT_CONTEXT.md); no agent edits without explicit user sign-off.',
      wrong: [
        'Consent card text is not layout-tested for 34–38ch on iPad mini',
        'Toggle for marketing emails not set to default-off',
        '"I agree" CTA does not require scroll-to-end (privacy risk)',
        'Persistent SecureStore key `age_answer_completed` not refreshed annually',
        'No way for parent to re-trigger consent after policy update',
      ],
      proposed: [
        'Body text 34–38ch on tablet (DESIGN.md §8.4)',
        'Marketing toggle default off; required rationale shown on activation',
        'CTA enabled only after scroll-to-end (proven COPPA pattern)',
        'Annual consent refresh via parent summary banner',
        'Re-consent path: ParentSettings → safety → re-confirm',
      ],
      authority: ['ENGLISH_LEARNING.md §2 (COPPA)', 'BEHAVIOR.md §5', 'GOOD-DESIGN-PRINCIPLES §5'],
      mockHTML:
        '<div class="pa-card">' +
          '<div class="pa-h" style="font-size:22px">Parent consent</div>' +
          '<div class="pa-sub" style="margin-top:6px">We collect only what we need to run TeeBot. Read the policy before continuing.</div>' +
          '<div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--p-line);padding-top:10px">' +
            '<span style="color:var(--p-ink)">Marketing emails</span>' +
            '<div class="on" style="background:var(--p-card-2)"></div>' +
          '</div>' +
          '<div class="pa-cta" style="margin-top:14px">I agree · continue</div>' +
        '</div>',
    },

    {
      id: 'network-error',
      num: 'S-03', lane: 'SHARED',
      title: 'Network Error / Safe Fallback',
      route: '/#/NetworkError',
      feature: 'src/features/fallback/screens/NetworkErrorScreen.tsx',
      captured: false,
      captureBlocker: 'Need to drop backend connectivity to capture; rerun the capture script after disable-WiFi sim action.',
      wrong: [
        'Generic "Check your internet" copy with no actionable retry button',
        'No trace ID shown (violates BEHAVIOR.md §3 SYSTEM_ERROR)',
        'No information about which backend host failed (RN-onrender vs api.TJBot.io)',
        '"Try again" same weight as "Open offline lessons"',
        'No fallback lesson when content unreachable (BEHAVIOR.md §7 + ENGLISH_LEARNING.md §6)',
      ],
      proposed: [
        'Specific: "Can\'t reach TeeBot (offline). Tap to retry or open the safe-fallback lesson."',
        'Show trace ID + correlation ID; user can copy to share with support',
        'Show backend host name (so owner can sanity check api.TJBot.io NXDOMAIN trap)',
        'Primary CTA: open fallback lesson. Secondary: retry',
        'Safe-fallback lesson chosen per ENGLISH_LEARNING.md §6 contract',
      ],
      authority: ['BEHAVIOR.md §3 (SYSTEM_ERROR)', 'BEHAVIOR.md §7 (safe-fallback)', 'ENGLISH_LEARNING.md §6'],
      mockHTML:
        '<div style="background:linear-gradient(180deg,#0E1A24,#000);color:#f5f7ff;border-radius:18px;padding:22px;text-align:center">' +
          '<div style="font-size:30px;font-weight:900">·</div>' +
          '<div style="font-weight:800;margin-top:6px">Can\'t reach TeeBot</div>' +
          '<div style="font-size:13px;opacity:.7;margin-top:6px">Trace 8af2…13 · host tbot-backend-8wmh.onrender.com</div>' +
          '<button class="ph-pill" style="border:0;background:#FF5555;color:#fff;margin-top:14px">Open offline lesson</button>' +
        '</div>',
    },

    {
      id: 'lesson-resume',
      num: 'S-04', lane: 'SHARED',
      title: 'Lesson Resume / Reconnecting Overlay',
      route: '/#/LessonResume',
      feature: 'src/features/lesson-session/screens/ReconnectingScreen.tsx',
      captured: false,
      captureBlocker: 'Requires an active session that gets dropped. Capture script can monkey-patch WS to test.',
      wrong: [
        'Modal disappears at 100% — no state breadcrumb of where the lesson was',
        'No way to manually retry WS connection (only auto-backoff)',
        'Reconnecting text uses raw color (audit #1)',
        'No way to abandon with "save progress for later"',
        'No disclosure of which connection failed (WS vs OBSERVER vs BLE)',
      ],
      proposed: [
        'State breadcrumb: "Lesson paused at step 3 of 5 — Listening" per BEHAVIOR.md §4',
        '"Reconnect now" pill above auto-backoff message',
        'Color uses kit token (--c-sun-soft for warning)',
        '"Save & exit later" ghost link per BEHAVIOR.md §5',
        'Which connection failed labeled (WS / Observer / BLE)',
      ],
      authority: ['BEHAVIOR.md §4', 'BEHAVIOR.md §5', 'GOOD-DESIGN-PRINCIPLES §2'],
      mockHTML:
        '<div style="background:#FFFBE6;border-radius:18px;padding:22px;text-align:center">' +
          '<div style="font-weight:800;color:#1C1C1E">Reconnecting…</div>' +
          '<div style="font-size:12px;color:#3A3A3C;margin-top:6px">Lesson paused at step 3 of 5 — Listening</div>' +
          '<div class="ph-pill" style="border:0;background:#1C1C1E;color:#fff;margin-top:14px">Reconnect now</div>' +
        '</div>',
    },

  ],
};
