---
name: deep-focus-android
description: Reproduce and classify actual Android WebView input, lifecycle, timer, notifications and accessibility defects without confusing Node unit tests with device evidence.
---

Read root AGENTS.md, current exact integration SHA, Issue #13, existing Android/CDP/UIAutomator reports and the active pull request chain. Build a disposable debug APK only; test real tap hitboxes, navigation, scroll, Back, text input, state restore, orientation, background timer and notification behavior. Record device/API, exact SHA, run ID, passes, actual FAILs and NOT_TESTED scenarios. A rendered DOM or green Node test does not prove Android touch outcomes. Never sign, release, change stored v21 data or automatically merge. For each genuine defect, provide reproducible steps and a focused test before scoped repair.