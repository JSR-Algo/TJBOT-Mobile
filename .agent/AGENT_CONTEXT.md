# AGENT_CONTEXT — tbot-mobile

## OWNED SYSTEMS
- sys-16: Parent Mobile App (iOS + Android)

## NOT OWNED — DO NOT MODIFY
- Firmware (tbot-firmware)
- Backend API (tbot-backend)
- AI services (tbot-ai-services)
- Infrastructure (tbot-infra)

## TECH STACK
- Framework: React Native + Expo (managed workflow)
- Language: TypeScript (strict mode)
- Navigation: React Navigation v6
- Secure storage: expo-secure-store (Keychain on iOS, Keystore on Android)
- BLE: react-native-ble-plx
- State management: confirm in codebase before assuming library
- Push notifications: Expo Notifications + FCM + AWS SNS

## PLATFORM TARGETS
- iOS: minimum version per EXPO_CONFIG (check app.json)
- Android: minimum SDK per EXPO_CONFIG (check app.json)
- Build system: Expo EAS Build

## FEATURES OWNED
- Onboarding flow (account creation, COPPA consent)
- BLE device pairing and management
- Device controls (volume, bedtime, activity selection)
- Conversation summaries (read-only display from backend)
- Push notification receipt and display
- Auth token management
- Realtime voice interaction via WebSocket (Google Live Flash 3.1 API backend)
  - Audio capture: PCM 16kHz mono via expo-audio
  - Voice Activity Detection (VAD): local, pre-stream filtering
  - Audio playback: unified response stream from Google Live (no separate TTS chunks)
  - State machine: idle u2192 listening u2192 recording u2192 processing u2192 speaking u2192 idle

## SECURITY REQUIREMENTS
- Auth tokens: ONLY via expo-secure-store (Keychain/Keystore)
- NEVER store tokens in AsyncStorage, MMKV unencrypted, or SecureStore with wrong options
- BLE pairing: verify device UUID against allowlist before pairing
- API calls: HTTPS only, certificate pinning required for auth endpoints

## COPPA COMPLIANCE
- Consent screen: parent must actively tap "I agree" — no pre-checked boxes
- NEVER auto-accept COPPA consent programmatically
- NEVER infer consent from other actions
- Consent timestamp must be sent to backend on acceptance
- Age gate must appear before any child profile creation

## ABSOLUTE PROHIBITIONS
- NEVER store auth tokens in AsyncStorage
- NEVER auto-accept or skip COPPA consent flow
- NEVER bypass authentication checks
- NEVER connect to non-allowlisted BLE devices
- NEVER display raw API error messages to end users
