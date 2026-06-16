# T29: Centralize icon library and remove inline SVG/emoji

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
There is no central icon library in the TJBot mobile app. Inline SVG snippets and emoji glyphs are scattered across production components, which hurts accessibility, bundle cacheability, and cross-platform consistency.

Audit findings (`docs/audits/ios-reference-audit/reports/ui-design-system.md`):
- **Improvements section, line 61**: `src/design-system/icons/README.md` and `src/design-system/icons/index.ts` are stubs; there is no central registry.
- **Top 3 quick wins, line 101**: Centralizing icons and killing inline SVG/emoji is the lowest-risk quick win.

Specific inline icon violations observed in the current codebase:
- `src/components/ErrorMessage.tsx` line 13: uses emoji `⚠️` inline in the alert text.
- `src/components/EmptyState.tsx` line 16: uses emoji `🤖` as the empty-state illustration.
- `src/components/gemini/BigMicButton.tsx` line 55: uses emoji `⏹` / `🎙` for the active/inactive microphone state.
- `src/components/gemini/ControlBar.tsx` line 47: uses emoji `⚙` for settings; lines 64-66 build the microphone icon from three raw `View` shapes.
- `src/design-system/components/PageHeader/index.tsx` lines 7 and 23-25: imports `Path`/`Svg` from `react-native-svg` for the back chevron.
- `src/components/DeviceRow/index.tsx` lines 71-77: declares a local `ChevronRight` that requires `react-native-svg`.
- `src/components/MicButton/index.tsx` lines 30-44: declares a local `MicSvg` that requires `react-native-svg`.
- `src/components/OnbShell/index.tsx` lines 61-68: declares a local `BackIcon` that requires `react-native-svg`.

`lucide-react-native` is already in `package.json` (line 79), so the dependency surface is ready.

## Scope
### In scope
Files and components to change:
- `src/design-system/icons/index.ts` — create the typed `Icon` component and export it.
- `src/components/ErrorMessage.tsx` — replace inline `⚠️` with `Icon`.
- `src/components/EmptyState.tsx` — replace inline `🤖` with `Icon`.
- `src/components/gemini/BigMicButton.tsx` — replace emoji mic icons with `Icon`.
- `src/components/gemini/ControlBar.tsx` — replace `⚙` and the custom `View` microphone with `Icon`.
- `src/design-system/components/CircleBtn/index.tsx` — ensure it remains icon-agnostic (no inline SVG/emoji).
- `src/design-system/components/PageHeader/index.tsx` — replace inline SVG back chevron with `Icon`.
- `src/components/DeviceRow/index.tsx` — replace local SVG chevron with `Icon`.
- `src/components/MicButton/index.tsx` — replace local SVG microphone with `Icon`.
- `src/components/OnbShell/index.tsx` — replace local SVG back arrow with `Icon`.
- `tests/verification/T29-centralize-icon-library.test.tsx` — regression test for the above.

### Out of scope
- `src/components/DeviceShell/index.tsx` (explicit registry non-scope).
- `src/navigation/*` (explicit registry non-scope).
- Removing native iOS/Android Gemini voice modules (T19).
- Deleting the Gemini JS layer (T18).
- Robot/avatar animation consolidation (T21).
- Token-surface migration beyond what is needed to pick an icon color (T28 owns the token surface).

## Proposed solution
1. **Create a typed `Icon` component** in `src/design-system/icons/index.ts`.
   - Re-export selected `lucide-react-native` icons behind a small, typed surface so callers do not import the entire library.
   - Support props: `name`, `size`, `color`, `strokeWidth`, `accessibilityLabel`, `testID`.
   - Default `size` and `color` to sensible design-system values derived from tokens/legacy-semantic so most call sites only pass `name`.
   - Example shape:
     ```ts
     import * as Lucide from 'lucide-react-native';
     export type IconName = keyof typeof Lucide;
     export interface IconProps { name: IconName; size?: number; color?: string; strokeWidth?: number; accessibilityLabel?: string; testID?: string; }
     export function Icon({ name, size = 24, color = colors.textPrimary, strokeWidth = 2, accessibilityLabel, testID }: IconProps): React.JSX.Element { ... }
     ```
2. **Replace inline emoji** in `ErrorMessage`, `EmptyState`, and `BigMicButton` with named `Icon` instances.
   - Preserve or improve `accessibilityRole`/`accessibilityLabel`. The emoji was being read by screen readers; `Icon` must provide an explicit label.
3. **Replace inline/custom SVG icons** in `PageHeader`, `DeviceRow`, `MicButton`, and `OnbShell`.
   - `PageHeader`: use `<Icon name="ChevronLeft" ... />` inside the existing `CircleBtn`.
   - `DeviceRow`: use `<Icon name="ChevronRight" ... />` for the trailing chevron.
   - `MicButton`: use `<Icon name="Mic" ... />`.
   - `OnbShell`: use `<Icon name="ChevronLeft" ... />` in the back button.
4. **Replace ControlBar icons**.
   - Settings gear → `<Icon name="Settings" ... />`.
   - Custom `View` microphone → `<Icon name="Mic" ... />` (active state can change `color`/`fill`).
5. **Verify with TypeScript and the regression test** (see Verification test plan).
6. Do not edit `CircleBtn` unless an inline icon is discovered during implementation; it already accepts children and has no inline SVG/emoji.

## Acceptance criteria
- A typed `Icon` component backed by `lucide-react-native` is exported from `src/design-system/icons`.
- All components in scope replace inline SVG/emoji with `Icon`.
- Accessibility labels are preserved or improved for every icon that was previously an emoji or unlabeled SVG.
- No inline emoji remain in the listed components.
- No inline `react-native-svg` usage remains in the listed components.

## Dependencies
- **T28 — Unify design-token surface and migrate legacy imports** (P1). T29 should consume the resolved token color for the default icon color. If T28 is not yet merged, T29 can use `colors.textPrimary` from `legacy-semantic.ts` and rebase once T28 lands.

## Exclusions / anti-overlap
- **T18 / T19 (Gemini removal branch)**. `BigMicButton.tsx` and `ControlBar.tsx` are Gemini components. If T00 chooses `REMOVE_GEMINI`, T18 will delete these files; T29 must not fight that deletion. If T00 chooses `SHIP_GEMINI`, T29 is the correct place to centralize their icons.
- **T21 — Unify avatar and waveform primitives on Reanimated**. T21 depends on T29 for icon replacement but must not re-introduce inline SVG/emoji while refactoring robot/avatar components.
- **T30 — Primitives compliance**. T30 may change `Pressable` haptics; T29 should not touch `Pressable` beyond passing icons through `CircleBtn`.

## Verification test plan
- **Test file**: `tests/verification/T29-centralize-icon-library.test.tsx`
- **What it proves**:
  1. `src/design-system/icons/index.ts` exports a defined `Icon` component.
  2. Each in-scope component that currently contains inline emoji or inline SVG no longer contains either, and imports `Icon` from `@/design-system/icons`.
- **How to run it**:
  ```bash
  npx jest tests/verification/T29-centralize-icon-library.test.tsx
  ```
- **Expected state before fix**: FAIL
  - `Icon` is not exported from `src/design-system/icons/index.ts`.
  - `ErrorMessage`, `EmptyState`, `BigMicButton`, `ControlBar`, `PageHeader`, `DeviceRow`, `MicButton`, and `OnbShell` still contain inline emoji or `react-native-svg` usage.
- **Expected state after fix**: PASS
  - `Icon` is exported.
  - No scoped component contains inline emoji or `react-native-svg` usage, and each icon-bearing component imports from `@/design-system/icons`.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| `lucide-react-native` is not in the current `transformIgnorePatterns`, so Jest may fail to transform it during test runs. | The verification test mocks `lucide-react-native` directly. T02 also adds `lucide-react-native` to the Jest transform whitelist, so the long-term fix is covered there. |
| Replacing emoji with Lucide icons changes the visual feel of empty/error states. | Use icons that are semantically equivalent (`AlertTriangle`, `Bot`) and keep the same container styling. Pair with a quick design review. |
| Gemini files in scope may be deleted by T18 if `REMOVE_GEMINI` is chosen. | T29's implementation for `BigMicButton` and `ControlBar` is small; if those files are deleted, the remaining T29 changes (the library and non-Gemini call sites) still stand. |
| Some call sites pass icons through `icon?: React.ReactNode` props (e.g., `DeviceRow`). | Replace only the internal trailing chevron; do not change the public `icon` prop contract in this task. |

## Coordination notes
None required per registry (`coordination_required: false`).

## Implementation hints
- Read `src/design-system/icons/index.ts` first; it is currently a placeholder.
- Useful Lucide icon mappings:
  - `ErrorMessage` → `AlertTriangle`
  - `EmptyState` → `Bot`
  - `BigMicButton` active → `Square`; inactive → `Mic`
  - `ControlBar` settings → `Settings`; microphone → `Mic`
  - `PageHeader` / `OnbShell` back → `ChevronLeft`
  - `DeviceRow` trailing chevron → `ChevronRight`
  - `MicButton` → `Mic`
- Keep the existing `CircleBtn` API; it already renders `children`, so `<CircleBtn ...><Icon name="ChevronLeft" /></CircleBtn>` works without changes.
- Preserve Vietnamese copy in `ControlBar`; only the glyphs change.
- If a file from the registry scope does not exist at implementation time, update this PRD and skip that component in the verification test.
