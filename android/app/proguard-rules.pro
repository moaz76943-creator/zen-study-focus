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
