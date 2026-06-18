package com.TJBotmobile

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost

class BootstrapApplication : Application(), ReactApplication {

  override val reactHost: ReactHost
    get() = TJBotReactHostProvider.getReactHost()

  override fun onCreate() {
    super.onCreate()
    TJBotReactHostProvider.initialize(this)
  }
}
