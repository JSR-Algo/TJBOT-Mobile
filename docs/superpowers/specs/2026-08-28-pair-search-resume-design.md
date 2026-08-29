# Pair Search Resume Design

## Problem

During owned-device Wi-Fi change, leaving `PairWifiScreen` returns to
`PairSearchScreen`. The robot cleanly disconnects GATT and advertises again, but
the previously mounted search screen does not start a fresh BLE discovery pass.
The UI remains on "Looking for Robot" until the user leaves the flow and opens
it again.

## Design

Tie BLE discovery to navigation focus instead of component mount alone.
`PairSearchScreen` starts one bounded discovery run whenever it becomes focused
and performs the existing cancellation cleanup whenever it loses focus or
unmounts. Returning from Wi-Fi selection therefore creates a new scan without
adding duplicate routes or changing the BLE protocol.

The existing scan algorithm, allowlist, retry bound, reconnect identity check,
and navigation payloads remain unchanged. Stale async work must observe the
cancellation flag before updating state or navigating.

## Error Handling

- BLE initialization and permission failures retain the current failure routes.
- Scan throttling and timeout retain the current error codes.
- Losing focus is cancellation, not an error; no failure screen is shown.
- A focused retry always starts from a clean `searching` state and empty
  candidate list.

## Verification

1. Add a regression test that focuses the screen, completes one scan, blurs it,
   focuses it again, and observes a second BLE scan.
2. Verify blur/unmount prevents stale scan results from navigating.
3. Run the existing pairing suites, TypeScript, lint, integration and repository
   validators.
4. Install the Android app and repeat three cancel/reconnect cycles followed by
   three complete Wi-Fi-change cycles on physical hardware.

## Scope

This change is mobile lifecycle handling only. It does not modify UUIDs, BLE
message schemas, Wi-Fi credential handling, backend APIs, firmware, pairing
ownership, or NVS state.
