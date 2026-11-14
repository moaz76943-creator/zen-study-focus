#!/usr/bin/env bash
# Instrumentation wiring exists only in the disposable CI workspace; nothing under android/ is committed.
set -euo pipefail
test -s android/app/build.gradle
test -s tests/android_tts/NativeTtsInstrumentation.java
cat >> android/app/build.gradle <<'GRADLE'

// Flashcards native TTS instrumentation, CI-only; not committed.
android {
    defaultConfig {
        testInstrumentationRunner 'com.zenstudy.focus.tts.NativeTtsInstrumentation'
        testApplicationId 'com.zenstudy.focus.ttstest'
    }
    sourceSets {
        androidTest {
            java.srcDirs += ['../../tests/android_tts']
        }
    }
}
GRADLE
