/**
 * React Native autolinking overrides.
 *
 * react-native-ble-plx@3.5.1 is incompatible with the RN 0.83 new-architecture
 * codegen pipeline — its `codegenConfig` is empty, so the generated
 * autolinking.cpp references `<BlePlx.h>` and a `react_codegen_BlePlx` CMake
 * target that never get produced. The only supported fixes are:
 *   1. upgrade react-native-ble-plx to a version with a proper codegen spec, or
 *   2. pin React Native back to <= 0.82 (old architecture), or
 *   3. opt ble-plx out of Android autolinking and link the legacy native
 *      package manually.
 *
 * Until ble-plx ships an RN 0.83-compatible release, we take option 3: keep it
 * out of generated autolinking/codegen, then include `:react-native-ble-plx`,
 * `implementation project(':react-native-ble-plx')`, and `BlePlxPackage()`
 * manually in the Android host. This preserves real BLE provisioning on
 * physical Android while avoiding the broken generated codegen target.
 *
 * Remove this override and the manual Android link when ble-plx is upgraded.
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
