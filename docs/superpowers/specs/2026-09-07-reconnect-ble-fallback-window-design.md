# Reconnect BLE Fallback Window Design

## Problem

When a robot boots where its saved Wi-Fi is unavailable, firmware retries Wi-Fi for about 60 seconds before automatically restoring BluFi advertising. The mobile reconnect screen currently performs three 10-second BLE scans, so it can report failure before the robot becomes discoverable.

## Design

Keep normal first-time pairing unchanged at three 10-second scans. In reconnect mode, perform two 40-second scans so the total discovery window spans 80 seconds and covers firmware's measured 60-second fallback while retaining one retry for a transient scan failure.

The existing screen cancellation guard remains authoritative: leaving the screen invalidates the active run, and results from an old scan cannot navigate. Bluetooth throttling remains terminal because retrying a throttled scanner cannot make progress.

## Verification

- Add a regression test proving reconnect mode passes a 40-second timeout to two successive scans and discovers a robot on the second scan.
- Preserve the existing normal-pairing late-advertisement test and verify its scan calls continue using the default timeout.
- Run the focused pairing test, full unit suite, TypeScript check, ESLint on touched files, and `git diff --check`.
