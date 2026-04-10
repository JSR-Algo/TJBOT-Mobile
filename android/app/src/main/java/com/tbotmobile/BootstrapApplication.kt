package com.tbotmobile

import android.app.Application

class BootstrapApplication : Application() {

  override fun onCreate() {
    super.onCreate()
    TbotReactHostProvider.initialize(this)
  }
}
