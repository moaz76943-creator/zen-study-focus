# Deep Focus — consolidation handoff 2026-10-20

Authoritative source: PR #43 to recovery integration PR #25, based on PR #42. The Android production code is **not** merged to `main` or distributed as a signed build. No data-key/schema, manifest-permission, package-ID, signing, or Play-release changes were made.

## Integrated source work
- PRs #39/#41/#42: actual legacy write, WebView, 20-language picker, compact Tasks, native completion session identity and deduplication, via exact inherited commit.
- PR #34: fail-closed Quality Center, master DF-001–161 ledger, source-only GitHub Actions.
- PR #37: developer Control Center v3, visual editor, agent request controls and strictly scoped, owner-reviewed workflows. Repaired missing `v3-ui.js`, wired all V3 dashboard controls, added regression tests; only cosmetic generated app stylesheet linked.
- PR #26: quarantined audio research and source/codec QA; 3 non-shipped candidate recordings, zero newly approved.
- PR #31: nonproduction UX prototype and isolated tests; no replacement of real persisted Notes/Tasks.
- PR #40: ported safe translated note-category label in real Notes editor; no stored text mutation.
- Android E2E classification: a WebView accessibility shell with zero HTML descendants is NOT_TESTED rather than a fabricated button failure; any observed app assertions with exposed controls remain FAIL. Does not imply Android UI acceptance.

## Verified prior integrated SHA
- Source SHA `bc8e98876ec99a1fc354c1869337c9007fd90644`: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39329397531
- 434/434 Node regressions, 31 Python unittest suites, 8 Android runner-helper tests, native JVM completion policy, and debug APK Gradle build PASS. Artifact ID 12224061892. **No Android emulator touch acceptance** in that workflow.
- Later fixes to translated Notes label and E2E classification need their own new exact-head CI run; do not reuse prior evidence as proof of new SHA.

## Release blockers
- Media provenance gate: 2 FAIL / 1 PASS; 10 named distributed Oggs have no individual commercial redistribution evidence; `earth.ogg` and `noise.ogg` are byte-identical.
- Three audio candidates are quarantined outside Android APK and lack original-to-derived hashes/on-phone listening.
- Android E2E WebView controls not exposed to prior UIAutomator, so downstream interaction scenarios remain unverified until proper device DOM/accessibility/visual QA.
- Real phone backup/recovery, 20 rendered locales, user touch paths, notifications/DND/Bluetooth, manual audio listening and human sign-off remain required.

**Do not remove the failing media gate, fabricate Android PASS, auto-release, force-push, or change v21 user storage.** Separate overlapping old drafts are retained for provenance; do not bulk merge superseded patches into the current native tree.

## Additional exact-SHA QA (20 October 2026)
- Android WebView DevTools is enabled only when `ApplicationInfo.FLAG_DEBUGGABLE` is set; release APKs keep debugging off. Security source tests were adjusted to assert this gated behavior, not globally forbid debugging in disposable test builds.
- A read-only CDP probe checks real Android WebView DOM (timer section, visible start/pause button, JS handlers and bundled file origin). It does **not** exercise touchscreen, audio or data writes.
- The first emulator CI attempt at `55667ac3a355f77799f5bffda9f07c644ea82e25` did **not reach the application**. Runner log: `Error on ZipFile unknown archive` during Android Emulator package preparation, followed by ADB TCP port 5554 connection refused. Classify **NOT_TESTED (emulator infrastructure)**, never app FAIL or PASS. Evidence: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39330512276.
- The first full source run at that SHA failed exactly one outdated `tests/security_recovery/webview_boundary.test.cjs` assertion expecting debug disabled for every build. This has been corrected to require release-only restriction; new exact-SHA CI verification is required.
- Expensive emulator runs are now manual-only while Android SDK download/bootstrap is broken; source CI continues automatically. No sign-off on Android functionality or UI defects is implied.

## Integration acceptance
Only merge this reviewed consolidation into the **draft source branch of PR #25**, not `main`, when its exact final SHA source/Gradle CI is green. Keep PR #25 draft. Do not auto-merge any overlapping old draft PRs; legacy branches may contain superseded data and unlicensed media. Release remains blocked by media rights and real-device QA.
