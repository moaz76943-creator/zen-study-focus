# Deep Focus: source-of-truth and anti-regression release firewall

As checked 2026-10-20, main at 2914999b5a6656dcc1c3c0cc2c5151b7b65f79aa still builds original Android v21.0.0, while recovery code is on multiple DRAFT branches, including PR #25 and stacked PRs #44, #49 and #52. Old GitHub Releases and the checked-in root app-release.apk are **not proof** of the newest fix and must not be used as the source of truth. Do not rename a Debug APK as production-ready. Historical app installs cannot be classified remotely without reading their build identity.

The default main workflow produces Debug test artifacts only, stamped with exact Git SHA and binary SHA256. Publication runs **only** by manual workflow dispatch, with the requested SHA equal to both actual checkout SHA and a repo-variable human-approved SHA. The selected integrated candidate SHA must be a Git ancestor of the publication SHA, and media provenance, Android UI E2E, actual backup restore, 20-locale functional checks and human release review must each be explicitly approved. A new monotonic Android versionCode (at least 22) and non-debug upload signing are mandatory. Every unknown/missing flag blocks release.

GitHub repo variables: ZEN_RELEASE_APPROVED_SHA, ZEN_CANDIDATE_SHA, ZEN_MEDIA_LICENSES_APPROVED, ZEN_ANDROID_E2E_APPROVED, ZEN_BACKUP_RESTORE_APPROVED, ZEN_20_LOCALES_APPROVED, ZEN_HUMAN_RELEASE_APPROVED. The five approvals must be literal true only after evidence specific to the release candidate; flags do **not** replace evidence. Upload secrets: ZEN_UPLOAD_KEYSTORE_BASE64, ZEN_UPLOAD_STORE_PASSWORD, ZEN_UPLOAD_KEY_ALIAS, ZEN_UPLOAD_KEY_PASSWORD. Never write these into Git or issue comments.

**Current state:** release remains intentionally blocked. Main's android/app/build.gradle still has debug signing and versionCode 21. These must not be changed until after reviewed integration and QA. Do not turn approval vars on to bypass the gate. The 20-language/media/device/data tests from *other* branches do not certify main.

## Integration protocol

1. Freeze the currently reviewed source baseline and inventory all open Draft PRs before touching app.js, v21 storage, sounds, translations or signing.
2. Reconcile overlapping PRs using their base/head SHAs. Perform normal non-force merges into a single review candidate; do not reset, force-push, restore an old archive or copy the entire app.js from a historical commit.
3. Run Node/Python, Gradle, emulator, device/data restore, all-locale UX, per-asset licensing and real audio checks at the **same exact integrated SHA**; record PASS, FAIL and NOT_TESTED independently.
4. Review and merge the integrated candidate into main only when release blockers are resolved, preserve user content and v21 keys, then advance versionCode and configure real upload signing. Verify candidate ancestry and exact SHA again.
5. Only then manually authorize GitHub release. Existing old GitHub Release assets and app-release.apk in the repo are historical artifacts. Keep an explicit evidence map for a rollback to a known-good *data-compatible* build; never silently downgrade user storage.

Never infer that a green Debug build proves touch navigation, nature audio rights, real Android background notifications, restored user data or Play Store readiness.
