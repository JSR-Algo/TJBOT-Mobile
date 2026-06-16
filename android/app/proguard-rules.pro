# Keep TJBot application entry points
-keep class com.TJBotmobile.BootstrapApplication { *; }
-keep class com.TJBotmobile.MainActivity { *; }
-keep class com.TJBotmobile.BuildConfig { *; }

# MultiDex
-keep class androidx.multidex.MultiDexApplication { *; }

# React Native bridge, fabric, and reflection
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.common.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep ReactPackage implementations for autolinking
-keep class * implements com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.TurboReactPackage { *; }

# Native methods and runtime annotations
-keepclasseswithmembernames class * {
    native <methods>;
}
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Hermes / JNI
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules — keep module implementations and exported members
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** {
    @expo.modules.kotlin.records.Field <fields>;
    @expo.modules.kotlin.views.ExpoProp <methods>;
    @expo.modules.kotlin.views.ExpoState <methods>;
    @expo.modules.kotlin.modules.Module <methods>;
}
-keep @interface expo.modules.kotlin.records.Field { *; }
-keep @interface expo.modules.kotlin.views.ExpoProp { *; }
-keep @interface expo.modules.kotlin.views.ExpoState { *; }

# Native dependencies consumed by the app
-keep class com.sentry.** { *; }
-keep class io.sentry.** { *; }
-keep class com.posthog.** { *; }
-keep class com.polidea.** { *; }
-keep class com.swmansion.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.** { *; }
-keep class com.orbital_systems.** { *; }
