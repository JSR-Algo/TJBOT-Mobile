# T28: Unify design-token surface and migrate legacy imports

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
The mobile design system currently operates with two parallel token authorities:

1. **Low-level tokens** under `src/design-system/tokens/*.ts` (`colors.ts`, `spacing.ts`, `radii.ts`, `shadows.ts`, `typography.ts`, `motion.ts`). These are consumed by newer primitives and `design-system/components/*`.
2. **Legacy semantic tokens** in `src/design-system/tokens/legacy-semantic.ts`, consumed by most production components such as `Button.tsx`, `Card.tsx`, `Input.tsx`, `OnboardingHeader.tsx`, and `MainTabNavigator.tsx`.

Because `legacy-semantic.ts` is only partially derived from the low-level tokens, names and values diverge (e.g., radius `card` vs `md`, typography `hero|title|body` vs `h1|h2|body1`), and local ad-hoc palettes such as `src/components/Device-tokens.ts` duplicate semantic colors. Any future brand or theme update must be edited in multiple places, and engineers cannot tell which source is authoritative.

Audit findings that drive this task:

- `reports/ui-design-system.md#improvements` (lines 43–68): identifies the two-token-system split and the local `DV`/`OB` palettes, and recommends re-implementing `legacy-semantic.ts` as a pure transform of the low-level tokens.
- `reports/ui-design-system.md#top-3-quick-wins` (line 103): lists “Unify the token surface” as the #2 quick win, explicitly calling out `legacy-semantic.ts`, migrating `src/components/*`, and deleting local palettes such as `Device-tokens.ts`.

Current evidence in source:

- `src/design-system/tokens/legacy-semantic.ts` (lines 8–54) imports the low-level palette but still hard-codes typography sizes/line-heights (line 25 `fontSize: 32`, `lineHeight: 40`) and radius values (line 44 `sm: 8`, lines 46–47 `lg: 16`, `xl: 24`) instead of deriving them from `typography.ts` and `radii.ts`.
- `src/components/Device-tokens.ts` (lines 1–11) defines a standalone `DV` palette (`bg: '#F5F5F2'`, `card: '#FFFFFF'`, `ink: '#1A1A1F'`, etc.) that duplicates colors already present in the design system.
- `src/components/Button.tsx` (line 10), `src/components/Card.tsx` (line 3), `src/components/Input.tsx` (line 3), and `src/components/OnboardingHeader.tsx` (line 3) all import from `legacy-semantic.ts`, but the semantic surface they rely on is not a pure transform of the low-level tokens.

## Scope

### In scope
- `src/design-system/tokens/legacy-semantic.ts` — re-implement as a pure transform of low-level tokens.
- `src/design-system/tokens/colors.ts`, `spacing.ts`, `radii.ts`, `shadows.ts`, `typography.ts` — extend or remap as needed so that legacy semantics can be expressed without hard-coded literals.
- `src/components/Button.tsx` — migrate to the unified semantic surface; remove any direct low-level token imports.
- `src/components/Card.tsx` — migrate to the unified semantic surface.
- `src/components/Input.tsx` — migrate to the unified semantic surface; replace inline emoji eye icons with the icon library (T29) or keep as a minimal text glyph if T29 is not yet merged, but do not add new local colors.
- `src/components/OnboardingHeader.tsx` — migrate to the unified semantic surface.
- `src/components/Device-tokens.ts` — delete or convert into a compatibility shim that re-exports unified semantic tokens mapped to the `DV` shape.
- `src/theme.ts` — keep as the public re-export barrel for `legacy-semantic.ts`; ensure it does not import direct low-level tokens independently.
- All production callers of `DV` from `src/components/Device-tokens.ts` (currently 18 device/pairing screens) must be updated if `Device-tokens.ts` is deleted, or must continue to work if it becomes a shim.
- `tests/verification/T28-unify-token-surface.test.ts` — regression test for the unified token surface.

### Out of scope
- `src/navigation/MainTabNavigator.tsx` — token migration is handled by **T26** to avoid overlapping edits (registry non_scope).
- `src/design-system/primitives/*` — fixes for `Box`, `Text`, `Pressable` are owned by **T30**.
- `src/design-system/theme/*` — runtime theme/gender switching is not required for this task.
- `src/design-system/icons/*` — centralizing the icon library is **T29**; T28 only removes local color palettes.
- Robot/avatar/waveform animation engine consolidation — owned by **T21**.
- Gemini component token cleanup — blocked by **T00/T17/T18/T19**.
- Snapshot/visual regression tests — mentioned in acceptance criteria as verification evidence, but creating the full visual regression harness is not required to close T28.

## Proposed solution

1. **Extend low-level tokens where gaps exist.**
   - `src/design-system/tokens/radii.ts`: add the missing radius steps (`sm`, `lg`, `xl`) or map legacy semantic names (`radius.sm`, `radius.lg`, `radius.xl`) to existing low-level values so `legacy-semantic.ts` can reference them directly.
   - `src/design-system/tokens/typography.ts`: add missing semantic sizes/line-heights (e.g., `h1`, `h2`, `h3`, `body1`, `body2`, `caption`, `button`) or rename low-level sizes so legacy semantics map 1:1. Keep the public `TypographyVariant` stable if possible.
   - `src/design-system/tokens/colors.ts`: add any missing semantic-friendly values (e.g., `dangerSoft`) so `Device-tokens.ts` can be replaced without raw hex literals.

2. **Re-implement `legacy-semantic.ts` as a pure transform.**
   - Every exported value in `colors`, `spacing`, `radius`, `shadows`, and `typography` must resolve to a value imported from the low-level token files.
   - Remove all hard-coded numbers, hex strings, and object literals from `legacy-semantic.ts` except for the structural mapping itself (e.g., `h1: { ...typography.styles.h1 }`).
   - Keep the existing public API shape (`colors.primary`, `spacing.md`, `radius.md`, `typography.h1`, etc.) so current callers do not need type changes.

3. **Remove the `Device-tokens.ts` local palette.**
   - Preferred: delete `src/components/Device-tokens.ts` and migrate the 18 device/pairing screens to import `DV`-mapped values from `legacy-semantic.ts` (or from a new `device` semantic namespace inside `legacy-semantic.ts`).
   - Acceptable short-term shim: rewrite `Device-tokens.ts` to re-export values from `legacy-semantic.ts` mapped to the old `DV` keys (`bg`, `card`, `ink`, `ink2`, `ink3`, `hair`, `accent`, `good`, `warn`), with no raw literals. This keeps the build green while screen migrations are staged.

4. **Migrate in-scope components.**
   - `Button.tsx`, `Card.tsx`, `Input.tsx`, `OnboardingHeader.tsx`: ensure they import only from `legacy-semantic.ts` (or the public `theme.ts` barrel) and not from both legacy-semantic and direct low-level token files.
   - Remove any inline hex literals used for style overrides in these components; replace with semantic tokens.

5. **Keep `theme.ts` as the public barrel.**
   - `src/theme.ts` should continue to re-export `colors`, `radius`, `shadows`, `spacing`, `typography`, and the default export from `legacy-semantic.ts`.

6. **Run typecheck and lint.**
   - `npm run typecheck` and `npm run lint` must pass after all changes.

## Acceptance criteria

1. `legacy-semantic.ts` is re-implemented as a pure transform of low-level tokens.
2. Components listed in scope import from the unified tokens and remove local ad-hoc palettes like `Device-tokens.ts`.
3. No production component imports both token systems for the same semantic value.
4. Visual regression tests or snapshot tests show no unintended style changes.

## Dependencies

None. T28 is foundational for the design-system surface and is itself a dependency of **T29** (centralize icon library) and **T30** (primitive compliance).

## Exclusions / anti-overlap

- **T26** owns `src/navigation/MainTabNavigator.tsx`; do not edit that file.
- **T29** owns `src/design-system/icons/index.ts` and replacing inline SVG/emoji in the listed components; T28 should not introduce new inline icons or new icon components.
- **T30** owns `src/design-system/primitives/Pressable.tsx`, `Box.tsx`, `Text.tsx`; T28 should not change primitive APIs.
- **T21** owns robot/avatar/waveform animation consolidation; do not refactor animation code under the guise of token cleanup.
- **T17/T18/T19/T20/T21** Gemini paths are blocked by **T00**; do not touch Gemini components for token cleanup.

## Verification test plan

- Test file: `tests/verification/T28-unify-token-surface.test.ts`
- What it proves: 
  - `legacy-semantic.ts` values are derived entirely from the low-level token files.
  - `src/components/Device-tokens.ts` no longer contains a local raw-color palette.
  - The in-scope components (`Button.tsx`, `Card.tsx`, `Input.tsx`, `OnboardingHeader.tsx`) import only from the unified semantic surface.
  - No production source file imports both `legacy-semantic.ts` and direct low-level token files (`colors.ts`, `spacing.ts`, `radii.ts`, `shadows.ts`, `typography.ts`).
- How to run it: `npx jest tests/verification/T28-unify-token-surface.test.ts`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Deleting `Device-tokens.ts` breaks 18 device/pairing screens. | Either keep a shim that re-exports unified tokens under the `DV` keys, or include the screen migrations in this PR and run `npm run typecheck`. |
| Re-mapping typography sizes changes visual appearance (e.g., `body1` 16 vs low-level `body` 22). | Extend low-level `typography.ts` with the missing scale steps so legacy values can be expressed without altering rendered sizes. |
| Hard-coded alpha strings like `colors.primary + '14'` in components become inconsistent. | Add a `withAlpha` helper or dedicated translucent tokens to `legacy-semantic.ts`; do not leave hex arithmetic in components. |
| Merge conflicts with T26/T29/T30. | Stay out of `MainTabNavigator.tsx`, `primitives/`, and `icons/`; keep edits scoped to the files listed above. |
| Visual regressions not caught by unit tests. | Run the existing component tests and, if available, capture RNTL snapshots before/after for `Button`, `Card`, `Input`, `OnboardingHeader`. |

## Coordination notes

No cross-repo coordination required. If the preferred option is to delete `Device-tokens.ts` and migrate the 18 device/pairing screens, notify the Firmware/Mobile boundary reviewer because those screens are in `src/features/device/**` and `src/features/device/pairing/**`.

## Implementation hints

- Read first: `src/design-system/tokens/index.ts`, `src/design-system/tokens/colors.ts`, `src/design-system/tokens/typography.ts`, `src/design-system/tokens/radii.ts`, `src/design-system/tokens/shadows.ts`, `src/design-system/tokens/spacing.ts`.
- The current `legacy-semantic.ts` exports `colors`, `typography`, `spacing`, `radius`, `shadows` and a default `theme` object. Preserve those exports exactly.
- `src/components/Device-tokens.ts` is imported as `import { DV } from '@/components/Device-tokens'` in 18 files. A shim can keep that import path working while removing the local palette.
- Use `npm run check:token-parity` (declared in `package.json`) after the change to catch drift between token files and consumers.
