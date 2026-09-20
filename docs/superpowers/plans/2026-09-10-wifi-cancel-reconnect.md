# Wi-Fi Cancel and Reconnect Verification

**Goal:** Android can connect the robot, cancel setup, and reconnect, with three consecutive physical E2E cycles before completion.

**Architecture:** Preserve the current BluFi protocol and backend fresh-heartbeat proof. Propagate cancellation from PairConnectingScreen into BLE, check ownership before each asynchronous stage and frame, and prevent abandoned operations from interfering with a newer session. Cancellation stops outstanding phone work; it cannot retract credentials already received by firmware.

**Stack:** React Native 0.83.4, React 19.2, RNTL 13, Jest 29, react-native-ble-plx, existing ESP32-S3 firmware and backend.

- [x] Reproduce cancellation while discovery/write is pending in `tests/ble/service.test.ts`, asserting no later frames and a usable new session.
- [x] Reproduce screen cancellation in `tests/features/device/pair-connecting-flow.test.tsx`, asserting the transport is aborted and late success cannot navigate.
- [x] Add bounded, attempt-owned cancellation to `src/services/ble/service.ts` and connect the screen cancellation action.
- [x] Run focused regressions, TypeScript, ESLint, unit/integration suites and repository validators; record failures without suppressing them.
- [x] Build/install the final Android source and identify the running robot firmware without erasing NVS.
- [x] Run three physical cycles: connect with fresh online proof; cancel an in-progress setup; reconnect with fresh online proof. Record each cycle separately. Ownership unpair/re-pair was not part of these Wi-Fi cancellation cycles and is explicitly outside the recorded proof.
- [x] Record source revisions, exact commands, physical evidence, and remaining limitations in the QA report. Host tests and readiness checks do not count as physical E2E.
