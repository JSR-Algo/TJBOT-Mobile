# AGENT_ENTRYPOINT — tbot-mobile

## BOOT SEQUENCE (execute in order)

1. READ AGENT_CONTEXT.md — confirm owned system (sys-16), platform targets
2. READ SYSTEM_CONTRACTS.md — load backend API endpoints and BLE protocol consumed
3. READ TASK_EXECUTION.md — load task ID format (MB-xxx) and coding rules
4. READ VALIDATION_CHECKLIST.md — load acceptance criteria before writing any code
5. VERIFY expo-secure-store is used for all token storage (grep AsyncStorage usage)
6. VERIFY COPPA consent screen exists and has no auto-accept code paths
7. VERIFY BLE allowlist is present and enforced in pairing flow
8. CHECK app.json for current Expo SDK version and platform minimums
9. LOAD active task by ID — reject any task without an MB-xxx identifier
10. CONFIRM task is within sys-16 — escalate cross-system changes to orchestrator

## ESCALATION TRIGGERS
- Task touches backend, firmware, AI services, or infra code → STOP, escalate
- Auth or token storage change requested → VERIFY secure storage compliance first
- COPPA flow modification requested → REQUIRE explicit privacy/legal sign-off
- BLE protocol change requested → STOP, coordinate with firmware team
- No task ID provided → REQUEST MB-xxx ID before proceeding

## CONTEXT RESET RULE
On every new session, re-read steps 1-4. Never assume prior session state is valid.
