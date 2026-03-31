# DOC_SYNC_RULES — tbot-mobile

## PURPOSE
Detect drift between this codebase and canonical spec: sys-16.
Run doc sync checks before every PR merge and after every spec update.

## SPEC SOURCES (READ-ONLY — never modify from this repo)
- sys-16: docs/specs/sys-16-parent-mobile-app.md

## MISMATCH DETECTION RULES

### API Endpoints
- VERIFY every endpoint used in code exists in sys-16 spec
- VERIFY request/response schemas match sys-16 spec exactly
- FLAG if spec adds new endpoint not yet called in mobile code
- FLAG if spec deprecates endpoint still used in mobile code
- FLAG if spec changes auth scheme (Bearer → other)

### BLE Protocol
- VERIFY SERVICE_UUID constant matches sys-16 spec
- VERIFY characteristic UUIDs match sys-16 spec
- VERIFY BLE command payloads match sys-16 spec
- FLAG any firmware-side BLE change that requires mobile update

### COPPA & Privacy
- VERIFY consent flow matches sys-16 spec step-by-step
- VERIFY age gate logic matches sys-16 spec
- FLAG any spec change to consent copy or flow order (requires legal review)
- FLAG if spec adds new data deletion requirement not implemented

### Navigation & Screens
- VERIFY all screens listed in sys-16 spec exist in navigation structure
- VERIFY deep link paths match sys-16 spec
- FLAG if spec adds new screen not yet implemented
- FLAG if spec removes screen still in navigation

### Push Notification Payload
- VERIFY PushPayload type values match sys-16 spec
- VERIFY deep link path format matches sys-16 spec
- FLAG new notification types in spec not handled in code

## SYNC CHECK PROCEDURE
1. Diff spec version tag against last-synced version in .agent/SPEC_VERSIONS
2. For each changed section, run targeted grep against codebase
3. List all mismatches with file:line references
4. BLOCK merge if any CRITICAL mismatch found
5. WARN (non-blocking) for additive spec changes not yet in code

## MISMATCH SEVERITY
- CRITICAL (merge blocker): auth scheme change, COPPA flow change, removed API endpoint in use
- HIGH (fix in current sprint): new required endpoint, BLE UUID change, new screen required
- MEDIUM (track in backlog): new optional feature, copy changes
- LOW (informational): formatting, non-functional spec updates

## SPEC_VERSIONS FILE FORMAT
```
sys-16: v4.1.0
last_sync: 2026-03-31
```
Update SPEC_VERSIONS after every successful sync check.
