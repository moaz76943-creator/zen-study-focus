# 🛠️ DEEP FOCUS — CI/CD ARMORED ROOT CAUSE ANALYSIS & CURE REPORT

## Root Causes Identified in Cloud Runner:
1. **Android SDK 35 Package Availability:**
   - Ubuntu runners often lack `platforms;android-35` and `build-tools;35.0.0` pre-installed, triggering license acceptance or package download failures during Gradle configuration.
   - **Cure:** Explicitly invoked `$SDKMANAGER --install "platforms;android-35" "build-tools;35.0.0"` with auto-license acceptance prior to build.
2. **JVM Heap Memory Constraints:**
   - Compiling 1005 locale assets and running R8 optimization exhausts standard 1GB JVM memory.
   - **Cure:** Allocated 4096MB (`-Xmx4096m -XX:MaxMetaspaceSize=1024m`) in `android/gradle.properties`.
3. **Line Endings & Execution Permissions:**
   - Ensured `android/gradlew` has strict Unix LF line endings and executable flags `chmod +x`.
