#!/usr/bin/env bash
# Android instrumentation Gradle configuration exists only in disposable CI workspace.
# Nothing under android/ is committed from this test setup.
set -euo pipefail
test -s android/app/build.gradle
test -s tests/android_touch/df08_instrumentation/TouchInstrumentation.java
cat >> android/app/build.gradle <<'GRADLE'

// DF08 isolated ephemeral Android test-source wiring, CI-only; not committed.
android {
    defaultConfig {
        testInstrumentationRunner 'com.zenstudy.focus.df08.TouchInstrumentation'
        testApplicationId 'com.zenstudy.focus.test'
    }
    sourceSets {
        androidTest {
            java.srcDirs += ['../../tests/android_touch/df08_instrumentation']
        }
    }
}
GRADLE
