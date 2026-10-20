# Track 08 — Phase 3 side-by-side install preflight

**Only a disposable Android QA build; never a release APK.**

App-tree parent: PR #85 candidate SHA `f97cc7d07c66ba0c85f22402aeeb76788146cc3e`. This independent audit branch adds a QA-only workflow, explicit Bash emulator harness and this report ONLY; no production application assets or Android Java code modifications.

## Intended source-to-install trace
- Build the unchanged standard Debug APK on an ephemeral GitHub runner; DO NOT share that original-package artifact for user installation.
- Edit only the ephemeral checkout `android/app/build.gradle` and `AndroidManifest.xml` to set the DEBUG-only suffix `.qa` and visible label `Deep Focus QA`; do not edit the committed files.
- Build a separate Debug APK for `com.zenstudy.focus.qa`.
- Check package identity, expected version, exact QA APK SHA256, signature verification, manifest permissions and metadata; FAIL if identity matches `com.zenstudy.focus`.
- Install both standard and QA packages on an isolated Android API30 emulator; assert both remain installed. Create a synthetic file under the original DEBUG app and prove the QA instance cannot read or erase it. Use NO actual owner device, production signing key, remote data or secrets.
- Launch QA, stop and restart it, verify a live QA process and observe Android logs. This proves install and minimal startup, NOT tasks/notes/timer acceptance.
- Publish **only the separate QA APK** and evidence for review. Artifacts are temporary. Android 20-case E2E and failure injection belong to PR #85's separate exact-source workflow, not to this package-smoke.

## Must remain blocked
- P0 actual SAF Save/readback/import still NOT_VERIFIED.
- PR #71 Gitleaks possible secret, 20-locale human review/4,608 missing key pairs, 10 nature audio candidate rights/listening not approved.
- Full owner-phone test, DND/Bluetooth/TalkBack remain not proven.
- Never merge to main, publish Play release, repackage an upload-signed build, migrate or overwrite user data, or claim `RELEASE_APPROVED=YES`.

`RELEASE_APPROVED=NO`.

## Actual executed evidence — 2026-10-20

**Status: PREINSTALL_QA_EMULATOR_PASS; PRODUCTION_RELEASE_BLOCKED.**

- Immutable app-tree parent PR #85: `f97cc7d07c66ba0c85f22402aeeb76788146cc3e`. Original production code is identical; checkout diff attestation proved only these three independent QA paths changed.
- Verified QA workflow SHA: `3fd4d8e3bacd37b6d11d9f7d4af997688379ae0a`.
- Completed GitHub Actions: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39430677836 — **SUCCESS, all jobs and steps PASS**.
- Artifact, from actual run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39430677836/artifacts/12267179669 . File `DeepFocus-Phase3-QA-Only.apk` plus `QA_APK_SHA256.txt`, QA manifest/signature and installation evidence. ZIP is time-limited by retention policy; it is **not** a Play Store release.
- Confirmed `com.zenstudy.focus.qa`, version `21.0.0-qa`, visible label `Deep Focus QA`, Debug signature checked with apksigner, no unexpected Android platform permissions. Exactly one app-owned AndroidX internal receiver permission with scoped QA package ID was accepted; arbitrary additions remained rejected.
- **Physical execution on disposable Android API30:** baseline Debug app installed; QA APK installed alongside it; both package IDs remained present. A synthetic private file in baseline package was retained before/after QA offline force-stop and restart. QA sandbox could not read that file. Both QA launches succeeded with no network needed. Source SHA and SHA256 metadata were uploaded with artifact.
- This evidence supports **a personal isolated QA trial only**. It does **not** prove full Android app functionality, actual SAF save/readback/import, owner phone acceptance or release permission.

## Integrated app-test evidence inherited from PR #85 (source hash distinct from docs-only PR head)

- Production-code+test source SHA `c92905cf66f1a017e53b8634ae42f3d513bf571a`. Subsequent PR #85 commit updates only this integration report.
- Node: **606 PASS / 0 FAIL**, Python **31 PASS**, native Java and original Debug APK **PASS**: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39428400428
- Real Chromium QA: **PASS**, 280 navigation/layout cases (320/360/393/430 px, five locales, two font scales), zero page overflow or clipped nav: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39428400467
- Disposable Android API30 real ADB/CDP: **16 PASS / 0 FAIL_APP / 4 NOT_TESTED**; separate v21 native fault probes **9 PASS / 0 FAIL / 1 NOT_TESTED**. Overall job **FAILURE** because legacy UIAutomator 20-case suite is NOT_TESTED and full SAF is missing: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39428400653

## Unresolved acceptance gates

- Native SAF DocumentsUI actual Save/readback/import, TalkBack, Bluetooth/DND/background audio and owner physical phone: NOT_VERIFIED.
- 20-language 4,608 key/locale gaps and human contextual translation: BLOCKED.
- Nature recordings: 10 authentic candidates are NOT production-approved; media release gate remains 1 PASS / 2 FAIL.
- Security PR #71 potential Gitleaks generic key match: requires confidential human review; do not disable the scanner or print the value.
- No production signing, main merge or Play publishing was performed.

**STAGED_INTEGRATION_SHA = `f97cc7d07c66ba0c85f22402aeeb76788146cc3e`.**  
**PREINSTALL_QA_RESULT = PASS on isolated QA package.**  
**FINAL_INTEGRATION_SHA = NOT_DELIVERED. RELEASE_APPROVED=NO.**


## QA package startup regression — resolved 2026-10-20

**Owner report:** earlier `Deep Focus QA` APK installed but immediately closed/failed to open.

**Verified root cause:** The original `MainActivity.onCreate()` hard-stops (calls `finish()`) for every package ID other than `com.zenstudy.focus`, before constructing WebView. The original QA packaging added `applicationIdSuffix '.qa'` and therefore `com.zenstudy.focus.qa` was rejected by design. The earlier PID-only smoke did not prove actual UI launch.

**Fix scoped to ephemeral CI Debug packaging:** In the temporary checkout ONLY, retain exact original-package guard and additionally accept `com.zenstudy.focus.qa` **only when** `ApplicationInfo.FLAG_DEBUGGABLE` is present. Production source `MainActivity.java`, signed release behavior and normal app package identity remain untouched. Commit includes `tests/track08/qa_launch_contract.test.cjs` (three regression checks) and `tests/track08/qa_webview_startup_probe.cjs` (live Android CDP). `tests/track08/phase3_side_by_side_qa.sh` exercises fresh start and offline force-stop/relaunch, and records screenshot, browser DOM and baseline-app sandbox isolation.

**Actual GREEN run:** [GitHub Actions #39437827149](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39437827149) — SUCCESS on exact source/QA-workflow SHA `44caa55609367622a8d2d481702573f6c579f84b`. All 3 startup guard Node tests PASS; normal and isolated QA Debug builds PASS; package ID/signature/permissions PASS. Two live Android emulator CDP probes report `readyState=complete`, URL `file:///android_asset/web/index.html`, `ZenNative` and `DF22Integration` available, and visible positive-dimension `#navTimer`, `#mainPlayBtn`, `#focusHeroCard` both before and after offline relaunch. Original synthetic private-data sentinel remained intact and inaccessible from QA package. A real screenshot `QA-OPEN-SCREEN.png` is included in the artifact.

**Replacement QA-only APK**: [artifact #12271688574](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39437827149/artifacts/12271688574); ZIP contains `DeepFocus-Phase3-QA-Only.apk`, `QA_APK_SHA256.txt`, startup probe JSON, screenshot and verification files. Do **not** install previous artifact #12267179669, which still has the QA package rejection. Since CI-generated Debug signing certificates can differ, the user should **uninstall only the broken Deep Focus QA** first; do not uninstall, reset, replace or clear data for their normal Deep Focus app.

**Remaining evidence boundary**: This is emulator API30 startup/UI readiness, *not* proof of Android 13 physical phone acceptance, all task/timer functional flows, SAF import/export, 20-language translation completion, approved sound rights or Gitleaks resolution. `RELEASE_APPROVED=NO`.
