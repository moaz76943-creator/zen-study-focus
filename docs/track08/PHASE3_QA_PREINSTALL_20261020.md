# Track 08 — Phase 3 side-by-side install preflight

**Only a disposable Android QA build; never a release APK.**

App-tree parent: PR #85 candidate SHA `f97cc7d07c66ba0c85f22402aeeb76788146cc3e`. This independent audit branch adds a QA workflow and this document ONLY; no production application assets or Android Java code modifications.

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
