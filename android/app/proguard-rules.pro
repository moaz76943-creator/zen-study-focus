-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-keepattributes *Annotation*,JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep public class com.zenstudy.focus.MainActivity { *; }
-keep public class com.zenstudy.focus.FocusTimerService { *; }
-keep public class com.zenstudy.focus.MainActivity$ZenNativeBridge { *; }

# ============================================================================
# MISSION #307: ProGuard & R8 Production Shrink & Keep Rules (v4.3.7)
# ============================================================================

# Preserve JavascriptInterface for WebView bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve WebView and WebSettings
-keep class android.webkit.** { *; }

# Preserve AndroidX Core Splashscreen
-keep class androidx.core.splashscreen.** { *; }

# Preserve MediaCompat & MediaSession for background audio bridge
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.** { *; }

# Preserve Deep Focus package classes
-keep class com.deepfocus.study.** { *; }
