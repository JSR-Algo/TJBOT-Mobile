# T5.4 Parent Session Assignment Bridge Design

## Purpose

Provide H1 with a test-only Android instrumentation command that uses the already authenticated
Parent app session to create exactly one direct `w02-feelings` v7 assignment through the normal
Parent endpoint while the visible app remains on Parent Today. The harness exists only to unblock
the strict physical closeout; it is not shipped in the production APK.

## Constraints

- H1 remains the only task authorized to install/run the test APK or create the assignment.
- The production APK, application manifest, JavaScript bundle, and runtime behavior do not change.
- The harness must never print, export, persist, or return access/refresh tokens.
- It must use the Parent app's existing `SecureStore` values and the normal
  `POST /v1/devices/{deviceId}/assignments` endpoint.
- It must not navigate, launch, refresh, or recreate `MainActivity`.
- It must fail before POST unless the target app is foreground and its hierarchy contains the
  Parent Today READY markers.
- It accepts one exact child/device/lesson identity and rejects arbitrary target overrides.
- It writes only a secret-free result containing the HTTP status and normalized assignment fields.
- A 401, malformed response, identity mismatch, active-assignment conflict, or route change is a
  hard failure. H1 must freeze the pass and must not retry with a second assignment.

## Architecture

`ParentSessionAssignmentBridgeTest` is an `androidTest` JUnit test packaged separately from the
release APK and signed with the same debug certificate already used by the installed release.
Android instrumentation loads it into the target application process/UID. The test obtains the
target context, reads the encrypted Expo SecureStore preferences, decrypts the access token using
the target UID's Android Keystore entry, and keeps the token only in memory.

The bridge performs a read-only route preflight using the existing fail-closed H1 hierarchy
artifact supplied as an instrumentation argument. It then issues one HTTPS JSON request with
`HttpURLConnection`, parses the response, verifies device/child/lesson/version/state, writes a
secret-free JSON result under target cache storage, and clears all in-memory references on exit.
The host pulls only that result file.

## Components

### `T54SecureStoreReader`

Reads `SecureStore.xml` key `key_v1-TJBot_access_token`, validates the Expo AES JSON envelope,
loads `AES/GCM/NoPadding:key_v1:keystoreUnauthenticated` from `AndroidKeyStore`, and decrypts the
value. It returns the token to the caller without logging it. Missing preferences, wrong scheme,
invalid tag length, or unavailable Keystore entry fail closed.

### `T54AssignmentRequest`

Holds constants for backend URL, device ID, child ID, lesson ID/version, and profile. It generates
the exact request JSON and validates the response. No instrumentation argument may replace these
identities.

### `ParentSessionAssignmentBridgeTest`

Requires `routeXml`, `resultPath`, and a one-use `confirmAssignmentId=PASS42` arming value. It
validates route XML markers before reading SecureStore, confirms the target package is foreground,
performs exactly one POST, validates the response, and writes only:

```json
{
  "httpStatus": 201,
  "assignmentId": "<uuid>",
  "assignmentVersion": 1,
  "deviceId": "91deb5af-c1c0-416b-956d-266d510eac5e",
  "childId": "2bbcd940-f9da-47cf-8a99-f1eaf2380e8c",
  "lessonId": "w02-feelings",
  "lessonVersion": 7,
  "state": "ASSIGNED"
}
```

## Failure Handling

The test deletes the exact prior result before execution. Any preflight or HTTP failure leaves no
success result. Error output may contain stable error codes but no header values, token fragments,
raw response bodies, email, or password. The host command uses `set -euo pipefail`, requires one
JUnit success, a new nonempty result, and exact identity fields before arming the answer helper.

## Verification

Host unit tests cover SecureStore envelope validation, route marker validation, response identity
validation, and a source scan proving no token-bearing log calls. Android compile verification
builds `assembleRelease` plus `assembleAndroidTest`, verifies both APK certificates match the
installed certificate, and inspects the test manifest target package. Physical validation first
runs a read-only mode that proves SecureStore availability and route readiness without making a
request; the one POST mode is used only inside the fresh strict H1 pass after capture/reset/cache
and collector readiness gates are green.

## Non-Goals

- General token export or credential recovery.
- An admin assignment endpoint.
- Changes to production auth, backend, database, or Parent navigation.
- Retrying assignment creation after any failed physical pass.
