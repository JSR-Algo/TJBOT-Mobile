# Wi-Fi Change Gesture Alignment

**Task:** `adhoc-2026-07-11-wifi-change-gesture`  
**Scope:** Mobile pairing and reconnect UX (`sys-16`)  
**Date:** 2026-07-11

## Problem

The Android pairing flow tells users to hold the robot's top button to enter
setup. On the active `lcdwiki-es3c35p` firmware, a BOOT double-click opens
Wi-Fi configuration while preserving the existing claim. A five-second hold
enters full repair pairing and clears claim and Wi-Fi state. The inaccurate
mobile guidance makes a routine Wi-Fi change destructive or leaves the phone
scanning while the robot is not advertising.

## Decision

Use one consistent gesture model throughout mobile-owned pairing surfaces:

- **Change Wi-Fi / reconnect:** double-click the robot BOOT button. This opens
  BluFi setup and preserves the existing account pairing.
- **Pair again / transfer ownership:** hold BOOT for five seconds. This is an
  explicit reset path that clears the current claim and saved Wi-Fi.
- **Power guidance:** keep power-on instructions separate from setup-mode
  instructions. Do not describe a long hold as the normal Wi-Fi-change action.

No BLE UUID, BluFi payload, backend endpoint, firmware gesture, or claim
contract changes are part of this task.

## UX Flow

1. A parent chooses the offline/reconnect or change-Wi-Fi action.
2. Mobile explains that a BOOT double-click keeps the robot paired.
3. Mobile starts BLE discovery and retains the existing bounded retries.
4. After discovering the robot, mobile reads the robot-provided Wi-Fi list.
5. The parent selects a network and submits its password through encrypted
   BluFi provisioning.
6. Mobile waits for the robot connection report and shows success only after a
   successful Wi-Fi join or the existing authoritative status confirmation.
7. Failure help distinguishes setup mode, password failure, distance, and the
   separate five-second repair-pairing escape hatch.

## Error Handling

- A BLE scan timeout tells the user to double-click BOOT and retry.
- A Wi-Fi authentication failure keeps the user in the Wi-Fi recovery lane and
  does not recommend repair pairing.
- Repair pairing is presented only as a deliberate last resort because it
  clears claim and saved network state.
- Existing retry bounds, cancellation behavior, and credential validation stay
  unchanged.

## Testing

- Unit/UI tests assert reconnect and failure screens use the double-click copy.
- Static-screen tests assert the five-second hold is labelled as reset/re-pair,
  not ordinary Wi-Fi setup.
- Existing BLE service tests continue to cover discovery, GATT reconnect,
  encrypted provisioning, connection reports, and timeouts.
- Physical Android + robot validation must prove:
  1. BOOT double-click makes the robot discoverable.
  2. The app provisions a selected Wi-Fi network successfully.
  3. Repeating the change-Wi-Fi flow preserves pairing and reconnects without a
     false BLE or Wi-Fi failure.

## Non-Goals

- Changing firmware button behavior.
- Factory reset automation.
- Changing BLE/BluFi schemas or backend claim semantics.
- Hiding genuine password, radio, or backend failures behind optimistic UI.
