package com.TJBotmobile

import android.app.Application
import com.bleplx.BlePlxPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.TJBotmobile.pcmstream.PcmStreamPackage
import com.TJBotmobile.voicemic.VoiceMicPackage
import com.TJBotmobile.voicesession.VoiceSessionPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Local native PCM streaming module — see android/.../pcmstream/
          add(PcmStreamPackage())
          // BLE provisioning is linked manually because RN 0.83 codegen
          // autolinking is disabled for react-native-ble-plx in react-native.config.js.
          add(BlePlxPackage())
          // App-level voice session owner (mode, focus, routing).
          add(VoiceSessionPackage())
          // Native AudioRecord + AcousticEchoCanceler — the Android twin of
          // iOS VoiceMicModule. Replaces the RNLAS path that had no AEC.
          add(VoiceMicPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
