/**
 * React Native autolinking overrides.
 *
 * react-native-ble-plx@3.5.1 is incompatible with the RN 0.83 new-architecture
 * codegen pipeline — its `codegenConfig` is empty, so the generated
 * autolinking.cpp references `<BlePlx.h>` and a `react_codegen_BlePlx` CMake
 * target that never get produced. The only supported fixes are:
 *   1. upgrade react-native-ble-plx to a version with a proper codegen spec, or
 *   2. pin React Native back to <= 0.82 (old architecture), or
 *   3. opt ble-plx out of Android autolinking entirely.
 *
 * Until ble-plx ships an RN 0.83-compatible release, we take option 3 for
 * local debug installs so the rest of the app (auth, households, devices API,
 * notifications, Gemini conversation) can actually be exercised against the
 * AWS staging backend on a physical phone. At runtime, the `initializeBle()`
 * helper in `src/ble/service.ts` already has a try/catch (added in the Round 2
 * device-registration fix) that catches the "native module not linked" error
 * and degrades gracefully to `{ available: false }`. So DeviceSetupScreen
 * still renders — it just shows the BLE section as unavailable instead of
 * crashing the bundle.
 *
 * Remove this override when ble-plx is upgraded.
 */
module.exports = {
  dependencies: {
    'react-native-ble-plx': {
      platforms: {
        android: null,
      },
    },
  },
};
