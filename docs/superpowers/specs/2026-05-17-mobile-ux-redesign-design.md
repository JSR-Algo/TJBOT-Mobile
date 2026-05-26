# Mobile UX Redesign Design

## Goal

Redesign TJBot mobile UX across parent, child, setup, purchase, fallback, and utility flows so the app works as a parent control panel while child-facing screens stay calm, short, safe, and easy to recover from.

## Scope

This redesign covers sys-16 only:

- Shared interaction primitives: CTA, secondary actions, icon buttons, shell back controls.
- Parent flows: parent gate, parent summary, account privacy, billing and purchase screens.
- Child-facing flows: home, lesson session, recovery, mic/audio, safety fallback.
- Setup flows: onboarding and device pairing.
- Dense utility flows: robot management, course/library, progress.

This redesign does not change backend API contracts, BLE wire protocol, COPPA legal text, authentication semantics, or payment provider behavior.

## UX Principles

- Parent is the primary mobile user.
- Child-facing screens show one intent, one primary action, and calm recovery copy.
- Parent screens behave like a control panel, not a game.
- Purchase and destructive account/device actions must be explicit, reversible where possible, and never hidden behind playful copy.
- Every interactive target must be reachable by touch and screen reader.

## Design System Decisions

Create one shared action model:

- Primary action: high-emphasis, one per screen, 44pt minimum, AA contrast.
- Secondary action: lower emphasis, still 44pt minimum.
- Destructive action: red/danger, explicit label, accessible hint where supported.
- Text link: only for low-risk navigation and still 44pt touch height.
- Icon-only action: requires an explicit accessibility label.

`PrimaryCTA`, `DeviceBigBtn`, `OnbBigBtn`, `CircleBtn`, `DeviceShell`, and `ParentScroll` are the first redesign surface because they affect most flows.

## Layout Decisions

- Replace absolute CTA footers with safe-area-aware sticky or scroll footers.
- Avoid fixed full-screen hidden overflow for long content where dynamic type matters.
- Use scroll containers for parent, purchase, setup, and utility screens.
- Child lesson screens may keep immersive layout, but primary CTA must not disappear at 200% dynamic type.
- Back controls must have visible 44pt size, not only hitSlop.

## Copy Decisions

- Parent copy uses direct action language: "Open parent controls", "Request export", "Cancel deletion".
- Child copy uses short calm language: "Try again", "Take a break", "Get a grown-up".
- Error copy must say what happened and what to do next.
- Avoid pressure words in purchase: no urgency, scarcity, or emotionally loaded upgrade copy.
- Keep legal/COPPA copy unchanged unless separately approved.

## Accessibility Decisions

- All pressable controls expose `accessibilityRole="button"` unless they are truly another role.
- Buttons infer labels from visible string children where possible.
- Disabled, selected, and busy states are exposed through `accessibilityState`.
- Destructive controls include clear labels and, where local patterns support it, hints.
- Contrast targets: AA for normal text and actionable text.

## Flow Redesign Targets

### Foundation

Fix contrast, touch target, role/label defaults, and shell back controls first.

### Parent And Purchase

Split dense screens into readable sections. Keep one primary task visible at a time. Group billing management actions below current status instead of mixing with plan choice.

### Child Lesson And Recovery

Use one short instruction, one primary action, and a safe fallback. Recovery screens must not imply blame.

### Device Pairing

Keep a clear decision tree: setup, reconnect, retry, or get help. Pairing failure should show likely causes as actionable rows with labels.

### Robot Management, Course, Progress, Home

Use shared controls and labels, then reduce repeated CTAs and dense row copy.

## Acceptance Criteria

1. Shared CTA and button text contrast passes AA for all default colors.
2. Shared buttons and shell back controls have visible minimum size of 44pt.
3. Interactive controls expose role, label, and state where applicable.
4. Representative high-risk screens have tests for a11y labels/states.
5. Parent and purchase screens reduce multiple competing CTAs.
6. Child recovery screens keep copy short and non-punitive.
7. Dynamic type risk is reduced by removing absolute footers from selected high-risk screens.
8. No `any`, `@ts-ignore`, `@ts-expect-error`, or COPPA text changes are introduced.

## Verification

- Targeted Jest tests for primitives and redesigned screens.
- Static contrast checks for action color pairs.
- `npx tsc --noEmit`.
- `npm run lint`.
- Targeted unit/e2e test files touched by redesign.

## Non-Goals

- Full visual redesign of robot illustration assets.
- Backend, BLE, legal, payment provider, or analytics contract changes.
- Native Detox runtime proof for every screen in this iteration.
