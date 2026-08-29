# Fresh Connectivity Gate For Wi-Fi Setup

## Problem

The device screen currently treats the backend lifecycle value `active` as proof
that a Robot is online. That value describes an owned, provisioned device; it
does not prove that the ESP server has a current Robot WebSocket. A stale device
therefore appears online and the Change Wi-Fi action fails later with a 409.

## Design

Device normalization will separate lifecycle state from live connectivity.
Only an explicit live connectivity signal may set `online` to `true`. An
explicit offline signal sets it to `false`; otherwise connectivity remains
unknown instead of being inferred from `active`.

The device screen will additionally require a recent `lastSeenAt` before sending
the remote Wi-Fi setup request. A missing, invalid, or stale heartbeat is treated
as unavailable for this action. The UI will show an actionable offline message
and will not send a request that is known to fail at the ESP boundary.

The backend and ESP server remain authoritative. A fresh-looking device can
still disconnect between the gate and delivery, so an actual 409 remains a
normal handled error rather than being hidden or retried automatically.

## Scope

- Correct mobile normalization so ownership lifecycle state does not imply
  realtime connectivity.
- Add a small, deterministic freshness predicate shared by the screen behavior
  and tests.
- Prevent Change Wi-Fi submission for missing, invalid, or stale heartbeat data.
- Preserve the existing successful navigation into reconnect-mode BLE search.
- Preserve backend ownership checks and ESP command delivery behavior.

## Testing

- A device with `status: active` and no connectivity signal is not online.
- Explicit online and offline connectivity signals retain their meanings.
- Fresh heartbeat permits remote Wi-Fi setup.
- Missing, invalid, and stale heartbeat block the request.
- A delivered request still navigates to reconnect BLE search.
- A backend 409 remains visible as the existing setup error.

## Physical Verification

After installing the new APK, validate against the attached Robot. Full Wi-Fi
change and unpair/re-pair cycling requires firmware `2.2.90` to be running on the
Robot. Until USB bootloader access or a working Robot-originated OTA path is
available, physical verification must report this as a hardware/firmware gate
instead of claiming the production journey passes.
