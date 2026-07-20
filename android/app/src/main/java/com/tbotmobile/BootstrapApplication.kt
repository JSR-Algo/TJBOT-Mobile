package com.tjbotmobile

import android.app.Application

class BootstrapApplication : Application() {

  override fun onCreate() {
    super.onCreate()
    tjbotReactHostProvider.initialize(this)
  }
}
