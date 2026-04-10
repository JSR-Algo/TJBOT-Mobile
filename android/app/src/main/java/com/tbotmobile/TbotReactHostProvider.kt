package com.tbotmobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

object TbotReactHostProvider {
  @Volatile private var application: Application? = null

  private val reactHostHolder: ReactHost by lazy {
    val app = checkNotNull(application) { "Application has not been initialized" }

    getDefaultReactHost(
        context = app.applicationContext,
        packageList =
            PackageList(app).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here.
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
