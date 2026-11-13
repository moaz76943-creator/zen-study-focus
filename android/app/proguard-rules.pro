# Deep Focus R8 / ProGuard Rules (M41)
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep WebView @JavascriptInterface bridge methods
-keepclassmembers class com.zenstudy.focus.MainActivity$ZenNativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Manifest-declared receivers, widgets, and Quick Settings tile
-keep class com.zenstudy.focus.FocusAlarmReceiver { *; }
-keep class com.zenstudy.focus.widget.** { *; }
-keep class com.zenstudy.focus.ZenFocusTileService { *; }
-keep class com.zenstudy.focus.NativeCsvWriter { *; }
-keep class com.zenstudy.focus.NativeLocaleStrings { *; }
