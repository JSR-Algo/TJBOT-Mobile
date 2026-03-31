# SYSTEM_CONTRACTS — tbot-mobile

## REST API CONSUMED FROM tbot-backend

Base URL: EXPO_PUBLIC_API_BASE_URL (environment variable, never hardcode)
Auth: Bearer token in Authorization header
Protocol: HTTPS only

### Auth Endpoints
- POST /v1/auth/register — create parent account
- POST /v1/auth/login — returns { accessToken, refreshToken }
- POST /v1/auth/refresh — body: { refreshToken } → returns new accessToken
- POST /v1/auth/logout — invalidates tokens server-side
- POST /v1/auth/coppa-consent — body: { consentTimestamp, parentId }
- DELETE /v1/auth/account — full account deletion (COPPA right to erasure)

### Device Endpoints
- GET /v1/devices — list paired devices for parent
- POST /v1/devices/pair — body: { bleDeviceId, deviceName }
- DELETE /v1/devices/:deviceId — unpair device
- PATCH /v1/devices/:deviceId/settings — body: device settings object

### Content/Summary Endpoints
- GET /v1/summaries/:deviceId — conversation summaries (read-only)
- GET /v1/summaries/:deviceId/:summaryId — single summary detail

### Error Codes Consumed
- 401 UNAUTHORIZED → trigger token refresh flow
- 403 COPPA_CONSENT_REQUIRED → show consent screen
- 404 DEVICE_NOT_FOUND → show pairing prompt
- 429 RATE_LIMITED → show retry-after message
- 5xx → show generic error, log to crash reporter

## BLE PROTOCOL CONSUMED FROM tbot-firmware

Service UUID: loaded from BLE_CONFIG.SERVICE_UUID constant (do not hardcode)
Transport: BLE GATT over react-native-ble-plx

### Characteristics (READ from firmware spec, do not infer)
- DEVICE_INFO_CHAR: device name, firmware version (read-only)
- CONTROL_CHAR: write commands (volume, bedtime mode, activity)
- STATUS_CHAR: notify on device state changes

### Pairing Flow
1. Scan for service UUID
2. Verify device UUID in allowlist
3. Connect → discover services → read DEVICE_INFO_CHAR
4. POST /v1/devices/pair with bleDeviceId and device name
5. Store pairing record locally (device ID only, no audio data)

### BLE Error Codes Consumed
- BleError.DEVICE_NOT_FOUND → "Device not found, move closer"
- BleError.DEVICE_DISCONNECTED → trigger reconnect, max 2 retries
- BleError.OPERATION_TIMEOUT → "Connection timed out, try again"

## PUSH NOTIFICATIONS

Providers: Expo Notifications SDK → FCM (Android) → AWS SNS
Token registration: send Expo push token to POST /v1/devices/push-token on login
Notification payload schema:
```typescript
interface PushPayload {
  type: 'SUMMARY_READY' | 'DEVICE_OFFLINE' | 'LOW_BATTERY';
  deviceId: string;
  deepLinkPath: string;  // e.g., "/summaries/device-123"
}
```
Deep link handling: navigate to deepLinkPath on notification tap
NEVER display raw notification payload to user
