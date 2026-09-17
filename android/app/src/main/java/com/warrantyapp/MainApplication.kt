package com.warrantyapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannels()
  }

  /**
   * Creates the notification channels required for FCM background push notifications.
   * Android 8+ (API 26+) requires channels to be created before notifications can appear
   * in the system tray. The "warranty_alerts" channel is referenced in AndroidManifest.xml
   * and in the backend FCM payload's android.notification.channelId field.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "warranty_alerts",
        "Warranty Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notifications for warranty case status updates, approvals, flags, and reviews"
        enableVibration(true)
        setShowBadge(true)
      }

      val notificationManager = getSystemService(NotificationManager::class.java)
      notificationManager?.createNotificationChannel(channel)
    }
  }
}
