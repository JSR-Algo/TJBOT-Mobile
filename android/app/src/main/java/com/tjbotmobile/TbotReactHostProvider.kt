package com.TJBotmobile

import android.app.Application
import com.bleplx.BlePlxPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.TJBotmobile.pcmstream.PcmStreamPackage
import com.TJBotmobile.voicemic.VoiceMicPackage
import com.TJBotmobile.voicesession.VoiceSessionPackage

object TJBotReactHostProvider {
  @Volatile private var application: Application? = null

  private val reactHostHolder: ReactHost by lazy {
    val app = checkNotNull(application) { "Application has not been initialized" }

    getDefaultReactHost(
        context = app.applicationContext,
        packageList =
            PackageList(app).packages.apply {
              // Local native PCM streaming module — see android/.../pcmstream/
              add(PcmStreamPackage())
              // BLE provisioning is linked manually because RN 0.83 codegen
              // autolinking is disabled for react-native-ble-plx in react-native.config.js.
              add(BlePlxPackage())
              // App-level voice session owner (mode, focus, routing).
              add(VoiceSessionPackage())
              // Native AudioRecord + AcousticEchoCanceler — Android twin of
              // iOS VoiceMicModule. Replaces RNLAS path (which had no AEC).
              add(VoiceMicPackage())
            },
    )
  }

  fun initialize(app: Application) {
    if (application == null) {
      application = app
      loadReactNative(app)
    }
  }

  fun getReactHost(): ReactHost = reactHostHolder
}
