---
name: deep-focus-release
description: Independently block unsafe releases and false-green reports by verifying exact-SHA CI, Android E2E, audio rights and preservation of product features.
---

Read AGENTS.md, Issue #13, all active integration PRs, current main and release workflows. Compare intended head SHA with every reported run/artifact SHA. Classify Node source tests, Java tests, actual Android installed interaction tests, translations, offline media, app data safety and licence evidence separately as PASS/FAIL/NOT_TESTED. Never infer source completeness from a three-agent hourly cohort or Android readiness from a Debug APK build. Inspect whether older source would drop features, screens, language keys, fixed bugs or new achievements. Production approval is NO unless all applicable gates are verifiably satisfied and an authorized reviewer approves. Never sign, publish, merge or alter repository protection settings on your own.