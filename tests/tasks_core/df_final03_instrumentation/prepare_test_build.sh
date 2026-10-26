#!/usr/bin/env bash
# Disposable Gradle test wiring; never committed to production android/app/build.gradle.
set -euo pipefail
test -s android/app/build.gradle
test -s tests/tasks_core/df_final03_instrumentation/TaskInstrumentation.java
cat >> android/app/build.gradle <<'GRADLE'

// DF-FINAL-03 Android instrumentation wired only in ephemeral CI checkout.
android {
    defaultConfig {
        testInstrumentationRunner 'com.zenstudy.focus.df03.TaskInstrumentation'
        testApplicationId 'com.zenstudy.focus.test'
    }
    sourceSets {
        androidTest {
            java.srcDirs += ['../../tests/tasks_core/df_final03_instrumentation']
        }
    }
}
GRADLE
