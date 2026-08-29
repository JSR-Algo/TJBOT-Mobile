# Pair Search Resume QA

Task: `adhoc-2026-08-28-pair-search-resume`

## Root Cause

`PairSearchScreen` started BLE discovery only from a mount-bound effect. Returning
from owned-device Wi-Fi selection focused the existing search route instead of
mounting a new component, so the robot re-advertised while the app retained an
inactive discovery pass.

## Automated Evidence

- Baseline focused suite: 38 tests passed before the change.
- Baseline unit suite: 231 suites and 2756 tests passed before the change.
- RED: two focus lifecycle tests failed because BLE discovery remained at one
  invocation after blur and refocus.
- GREEN: focused suite passes 40 tests, including fresh-refocus discovery and
  stale-run navigation suppression.

## Physical Evidence

Pending Android build/install and the requested three cancel/reconnect plus
three complete Wi-Fi-change cycles. Evidence must record only lifecycle states,
durations, and pass/fail verdicts; credentials and device identifiers are
excluded.
