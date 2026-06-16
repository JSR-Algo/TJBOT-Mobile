# T06: Move pairing mutable state into an actor/store

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
`src/features/device/pairing/pairingSession.ts` currently stores the pairing flow's runtime state in mutable module-level `let` bindings:

```ts
// src/features/device/pairing/pairingSession.ts:14-16
let activeCandidate: PairingCandidate | null = null;
let connectedDevice: ESPDevice | null = null;
```

This design has three concrete failure modes identified in the audit:

1. **State leaks across screen instances.** Because the variables live at module scope, navigating away from a pairing screen and back in does not reset the session; the previous candidate or connected device is still present.
2. **State survives component unmount.** React has no lifecycle hook over module variables, so there is no automatic cleanup if the pairing flow is abandoned.
3. **Risk of corruption on concurrent pairing attempts.** A second pairing attempt while another is in progress mutates the same variables, which can cause `clearPairingSession` to disconnect the wrong device or leave a stale reference behind.

Audit sources:

- `reports/ble-provisioning.md#improvements` — lines 70-71: "pairing state (`activeCandidate`, `connectedDevice`) is stored in mutable module-level variables, not in React or a store. Process death, deep-link entry, or concurrent pairing attempts can corrupt the session. Move it to a React Context, Zustand store, or the existing XState actor so lifecycle is explicit."
- `reports/state-architecture.md#improvements` — lines 76-77: "`src/features/device/pairing/pairingSession.ts` stores `activeCandidate`, `connectedDevice` as mutable module variables (lines 14–16). This leaks across screen instances, survives component unmount, and is not reactive. If the user force-quits mid-pair, stale references can persist. Replace with an XState actor or at least a Zustand/React-Query store with cleanup on flow exit."
- `MASTER_AUDIT.md#cross-cutting-themes-1` — lines 16-19: pairing session state is cited as a primary example of "state machines exist but are not wired to the UI," with the recommendation to move `pairingSession.ts` mutable state into the existing `devicePairingMachine` actor or a single actor/store.

## Scope

### In scope
- `src/features/device/pairing/pairingStore.ts` — create a new Zustand store that owns `activeCandidate` and `connectedDevice`.
- `src/features/device/pairing/pairingSession.ts` — refactor the module-level variables to read from and write to the new store while preserving the existing public API.
- `tests/verification/T06-pairing-state-actor-store.test.ts` — add a verification test proving the store exists, owns the lifecycle, and still disconnects on cleanup.

### Out of scope
- Pairing screens under `src/features/device/pairing/screens/*` (handled by T05).
- The XState `devicePairing.machine.ts` actor wiring (intentionally deferred; this task only replaces the mutable module state with a store).
- React Context or React Query migration for other flows.
- Changes to BLE scan, provisioning, or error-mapping logic.

## Proposed solution

1. **Create `src/features/device/pairing/pairingStore.ts`** with a Zustand store.
   - State shape: `{ activeCandidate: PairingCandidate | null; connectedDevice: ESPDevice | null }`.
   - Actions: `setActiveCandidate(candidate)`, `setConnectedDevice(device)`, `clearSession()`.
   - `clearSession()` calls `disconnect()` on the stored ESP device (with a try/catch ignore, matching current behavior) and then resets both fields to `null`.

2. **Refactor `src/features/device/pairing/pairingSession.ts`**.
   - Remove the top-level `let activeCandidate` and `let connectedDevice` declarations.
   - Implement `setPairingCandidate`, `getPairingCandidate`, `setConnectedEspDevice`, `getConnectedEspDevice`, and `clearPairingSession` as thin delegates to the Zustand store.
   - Keep the existing `PairingCandidate` interface and the `deriveSerialFromBle` / `deriveDisplayCode` helpers untouched so current tests continue to pass.

3. **Expose a deterministic reset mechanism for tests.**
   - The store should expose `getState`/`setState` (Zustand default) so verification tests can reset state in `beforeEach`. Do not add a production-only `__reset` helper unless absolutely necessary; prefer Zustand's native API.

4. **Preserve the existing imperative API contract.**
   - `setPairingCandidate(null)` continues to clear `connectedDevice`.
   - `clearPairingSession()` continues to disconnect the device and null both fields.

Example target shape:

```ts
// src/features/device/pairing/pairingStore.ts
import { create } from 'zustand';
import type { ESPDevice } from '@orbital-systems/react-native-esp-idf-provisioning';
import type { PairingCandidate } from './pairingSession';

interface PairingStoreState {
  activeCandidate: PairingCandidate | null;
  connectedDevice: ESPDevice | null;
  setActiveCandidate: (candidate: PairingCandidate | null) => void;
  setConnectedDevice: (device: ESPDevice | null) => void;
  clearSession: () => void;
}

export const usePairingStore = create<PairingStoreState>((set, get) => ({
  activeCandidate: null,
  connectedDevice: null,
  setActiveCandidate: (candidate) => {
    set({ activeCandidate: candidate });
    if (!candidate) {
      set({ connectedDevice: null });
    }
  },
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  clearSession: () => {
    const { connectedDevice } = get();
    if (connectedDevice) {
      try {
        connectedDevice.disconnect();
      } catch {
        /* ignore */
      }
    }
    set({ activeCandidate: null, connectedDevice: null });
  },
}));
```

```ts
// src/features/device/pairing/pairingSession.ts (refactored public API)
import { usePairingStore } from './pairingStore';

export function setPairingCandidate(candidate: PairingCandidate | null): void {
  usePairingStore.getState().setActiveCandidate(candidate);
}

export function getPairingCandidate(): PairingCandidate | null {
  return usePairingStore.getState().activeCandidate;
}

export function setConnectedEspDevice(device: ESPDevice | null): void {
  usePairingStore.getState().setConnectedDevice(device);
}

export function getConnectedEspDevice(): ESPDevice | null {
  return usePairingStore.getState().connectedDevice;
}

export function clearPairingSession(): void {
  usePairingStore.getState().clearSession();
}
```

## Acceptance criteria

1. `activeCandidate` and `connectedDevice` live in a Zustand store or XState actor instead of module-level `let` bindings.
2. The public API of `pairingSession.ts` (`setPairingCandidate`, `getPairingCandidate`, `setConnectedEspDevice`, `getConnectedEspDevice`, `clearPairingSession`) remains stable for existing screens.
3. `clearPairingSession` still eagerly disconnects the ESP device.
4. Unit tests verify store lifecycle and cleanup.

## Dependencies

- **T05 — BLE provisioning cleanup, retry, and error mapping.** T05 changes `PairWifiScreen` and `PairConnectingScreen` effect cleanup, which may call `clearPairingSession`. T06 must preserve that contract. Implement T05 before T06 so the cleanup semantics are already in place.

## Exclusions / anti-overlap

- **T05** must not change the public API of `pairingSession.ts` while T06 is in flight; any new cleanup helpers should call the existing functions.
- **T07** touches BLE allowlist logic and does not intersect with pairing session state.
- **T16** wires the lesson session machine and is unrelated to the pairing flow.

## Verification test plan

- **Test file:** `tests/verification/T06-pairing-state-actor-store.test.ts`
- **What it proves:**
  - A Zustand store exists at `src/features/device/pairing/pairingStore.ts` and owns `activeCandidate` and `connectedDevice`.
  - The imperative API in `pairingSession.ts` delegates to the store rather than module-level variables.
  - `clearPairingSession` calls `disconnect()` on the connected device and resets both store fields.
  - Setting the candidate to `null` clears the connected device.
- **How to run it:** `npx jest tests/verification/T06-pairing-state-actor-store.test.ts`
- **Expected state before fix:** FAIL — `pairingStore.ts` does not exist and `pairingSession.ts` uses module-level mutable state.
- **Expected state after fix:** PASS

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| A screen or test imports `pairingSession.ts` at module load and the new store triggers side effects too early. | Keep the Zustand store pure; no native calls happen until `setConnectedEspDevice` or `clearPairingSession` is invoked. |
| `connectedDevice.disconnect()` is called on a stale reference after the device object has already been garbage-collected or disconnected. | Preserve the existing try/catch-ignore behavior; do not change the disconnect contract. |
| The refactor accidentally breaks the existing `tests/features/device/pairingSession.test.ts` helper tests. | Leave `PairingCandidate`, `deriveSerialFromBle`, and `deriveDisplayCode` untouched. Run the existing test suite after the change. |
| Two pairing flows run concurrently and the store state is overwritten. | This is already a risk today with module variables. The store does not eliminate concurrency risk, but it makes state explicit and observable; the next step (machine wiring) will serialize the flow. Document this residual risk. |

## Coordination notes

No coordination required (registry `coordination_required: false`). T05 should land first because it finalizes the screen-level cleanup that calls `clearPairingSession`.

## Implementation hints

- Read `src/state/voiceAssistantStore.ts` for the project's established Zustand convention (`import { create } from 'zustand'`).
- The existing test `tests/features/device/pairingSession.test.ts` only exercises `deriveSerialFromBle` and `deriveDisplayCode`; keep those helpers stable.
- If a future task wires `devicePairing.machine.ts` to the screens, the machine can either consume this Zustand store or replace it. Design the store API (setters + getters) so the transition is mechanical.
- Avoid adding `__reset`-style test-only methods unless required by another test; use `usePairingStore.setState({ activeCandidate: null, connectedDevice: null })` in `beforeEach`.
