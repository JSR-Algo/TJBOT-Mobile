package com.TJBotmobile

import android.app.Application

class BootstrapApplication : Application() {

  override fun onCreate() {
    super.onCreate()
    TJBotReactHostProvider.initialize(this)
  }
}
