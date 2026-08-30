# Pair Search Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restart owned-device BLE discovery whenever the search screen regains focus, without allowing stale discovery work to navigate.

**Architecture:** `PairSearchScreen` observes navigation focus and assigns every focused discovery pass a monotonically increasing run id. Blur, back actions, and a newer focus invalidate the previous run; all asynchronous boundaries verify the run id before state updates or navigation.

**Tech Stack:** React Native 0.83, React Navigation 7, TypeScript strict, Jest 29, Testing Library React Native.

---

### Task 1: Lock In The Focus-Resume Regression

Add controllable focus and stale-run tests to `tests/features/device/pair-search-helpers.test.tsx`, then run the focused Jest file and confirm the current mount-only effect fails the resume assertion.

### Task 2: Bind Discovery To Focus With Run Ownership

Use navigation focus in `src/features/device/pairing/screens/PairSearchScreen.tsx`, invalidate old runs on blur/back, guard every asynchronous boundary, reset focused-search UI state, and run the focused and pairing regression suites.

### Task 3: Synchronize Pairing Documentation

Update `migrate-ui-ux-to-mobile-app-docs/state-machines/device-pairing.state.mmd` and create `migrate-ui-ux-to-mobile-app-docs/qa/2026-08-28-adhoc-pair-search-resume.md` with RED/GREEN and physical evidence.

### Task 4: Build, Install, And Run Physical 3+3 HIL

Build/install Android, run three cancel/reconnect cycles, then run three complete Wi-Fi-change cycles with clean BLE teardown and cloud-online stability checks.

### Task 5: Run Production Gates

Run TypeScript, lint, full unit and integration suites, all required repository validators, `git diff --check`, and final credential/protocol/scope review. Do not commit unless explicitly requested.
