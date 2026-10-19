# DEEP-FOCUS-RECOVERY-01 — Baseline & Data Safety
Date: 2026-10-19 (Asia/Amman). Source of truth: https://github.com/moaz76943-creator/zen-study-focus/issues/13.
Ownership: docs/recovery_baseline/ and tests/recovery_baseline/ ONLY. No source, workflow, release, Android native, or central test file changed.

## 1. Live verified commit references

| Ref | Full SHA | Status |
| --- | --- | --- |
| main | fab0b8bb82d0031e8de4e54086734be94bb38cc0 | untouched |
| recovery branch | 632ef51ae6034224e6b459e0962a8bbedbf2b18e | approved tested base of this work |
| PR #1 HEAD | 632ef51ae6034224e6b459e0962a8bbedbf2b18e | open Draft to main; DO NOT MERGE |
| PR #9 merge | c956bd19fba88b429c822ccfc33d5f66af2a1928 | already integrated into recovery |
| PR #11 merge | 632ef51ae6034224e6b459e0962a8bbedbf2b18e | already integrated into recovery |
| PR #12 HEAD | 0743111c9caa2f37b82b3954403d3d2a2467d544 | open Draft; incompatible locale edits |

Baseline CI: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39195473423 — verify success (JS, Node, Python, debug APK, unsigned AAB); signed-release skipped. PR #12 CI https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39204933764 — build/source PASS, NOT on-device QA. Recheck live SHAs before future merges. Dedicated branch audit/deep-focus-01-baseline-data-safety-20261019 was created directly from exact recovery base; remote-only creation does not touch Termux or Gemini worktrees.

## 2. Each of the original twelve tasks (DF-001–DF-012)

Statuses are TODO, BLOCKED, IN_PROGRESS, TESTED and DEFERRED. TESTED does not mean Android or release PASS.

| ID | Original goal, concise | State | Evidence / remaining blocker |
| --- | --- | --- | --- |
| DF-001 | Live main, recovery, PR #1, PR #12 and full SHAs | TESTED | table above |
| DF-002 | Isolate Gemini agents from main/recovery/PR #12; topic branch off tested recovery SHA | TESTED | independent branch created; no local Gemini operation |
| DF-003 | REAL phone ZEN21:: backup and disposable offline restoration | BLOCKED | only synthetic, disposable in-memory backup/mirror/rollback tests run; user phone backup NOT obtained |
| DF-004 | Screenshots and repeatable evidence for seven problem groups | BLOCKED | source-only issue inventory below; Android screenshots/runtime not available |
| DF-005 | Actual phone Android, WebView, dimensions/disk and runner constraints | BLOCKED | build and CI settings inspected, device version/size/free disk inaccessible |
| DF-006 | Read v21 data contract, media evidence, release QA and integration | TESTED | source files listed below inspected |
| DF-007 | Check all worktrees clean and preserve existing files | BLOCKED (local) | remote fresh branch, new scoped files only; Gemini/phone worktree cannot be inspected |
| DF-008 | Explicit PR collision matrix covering all areas | TESTED | section 5 |
| DF-009 | Adopt P0/P1/P2 and unique ID statuses | TESTED | this table and section 6; DF-ID commits |
| DF-010 | Commands, tests, failures, licensing, changed files, SHA trail | IN_PROGRESS | section 7; final CI and commit SHA in PR |
| DF-011 | Check Gemini CLI/Termux support and stop unsafe installs | BLOCKED | cannot interrogate phone CLI; no Gemini execution, sudo, fork or curl-pipe-sh attempted |
| DF-012 | Human approval before merging or changing permissions/media/backup/signing/release | IN_PROGRESS | review gate documented; NO merge/config alteration, human approval pending |

DF-003, DF-004, DF-005, DF-007 local and DF-011 cannot be marked done from GitHub evidence. Real phone backup prerequisite remains mandatory before any user-data changes.

## 3. v21 data contract from actual app and standalone compatibility implementation

Sources read: docs/contracts/DATA_COMPAT_V21.md; docs/MEDIA_LICENSES.md; docs/QA_08_RELEASE_AUDIT_20261019.md; android/app/src/main/assets/web/app.js, data_compat_v21.js, preflight_v22.js, integration_v22.js; AndroidManifest.xml; android/app/build.gradle; .github/workflows/build_apk.yml. Android JS also inspected as packaged in test APK from the exact baseline CI artifact.

- cfg: JSON object. lang, domain, focusMin, shortMin, longMin, todayMins, sessions, streak, water, sets, pagesRead and unknown fields must survive. Optional sessionHistory entries use id,date,minutes,domain; session IDs are opaque (often strings), not numeric note/task IDs. Duplicate session IDs are warned about without deletion. No fabricated start timestamps.
- tasksList: records with id as JavaScript number, title, done boolean, isStarter, catKey, date, optional time, unknown keys. Original starter IDs 1–4.
- notesList: records with id as JavaScript number, title, body, optional calDate, catKey, blur, pinned, favorite, isStarter, unknown keys. Original starter IDs 1–3. IDs may overlap across separate task/note namespaces.
- Three primary-and-mirror storage pairs: zen_fortress_cfg_v21, zen_fortress_tasks_v21, zen_fortress_notes_v21, each with _mirror. JSON packet is {payload: JSON.stringify(value), sig: computeHash(payload), ts}. Never overwrite corrupt primary just because mirror is healthy.
- ZEN21:: backup: prefix + Base64 of UTF-8 JSON {bundle: JSON.stringify({cfg,tasksList,notesList,v:21}),sig:computeHash(bundle)}; prefixless backup also accepted by standalone parser. Salted FNV-like hash is ONLY an integrity checksum, NOT encryption, authentication or secrecy.
- The independent keys zen_fortress_active_timer_v21 and deep_focus_unsaved_note_draft_v1 are NOT part of the v21 three-family backup. They must not be overwritten during an additive migration.
- data_compat_v21.js exposes inspectRecords, inspectStorage, inspectBackup, planMigration, planMigrationFromStorage, planRestoreFromBackup, commitPlan, inspectPending and recoverPending. Journaled changes require explicit approval; pending journal blocks startup writers and must not be silently resolved.

Important unresolved compatibility discrepancy: app.js legacy validateImportedBackup uses numeric-string-compatible safeRecordId checks. The standalone v21 contract rejects numeric strings and note_*/task_* identifiers. Coordinator 00 must reconcile them without silently changing IDs or dropping records. Another adjacent concern: app.js global toWest() input listener applies also to TEXTAREA, potentially altering user-authored Eastern Arabic numerals. Do not fix in this lane; flag to UI/data coordinators.

## 4. Seven defect areas and actual verification boundary

| Reported area | Verified source finding / issue | Real phone screenshots/tests |
| --- | --- | --- |
| Authentic nature audio | recovery baseline still includes synthesized fallback; license ledger blocks unaudited assets; PR #12 partially removes synth | BLOCKED |
| Session completion sounds | at least five gentle, licensed, non-musical alerts and device audio-focus/repeat tests not established | BLOCKED |
| Twenty language choices | ar, fa, ur are existing locales; PR #12 filters/forces English and must be rejected as-is | BLOCKED |
| ASCII numeral display | toWest() exists but numeric glyph handling in authored text and SVG requires review | BLOCKED |
| All buttons/actions | PR #12 targets misleading analytics cards and SAF path, but 100-target runtime QA absent | BLOCKED |
| Notes/tasks | integrated modules exist, journal/numeric IDs need real editing and restore tests | BLOCKED |
| Truthful analytics | legacy history has id/date/minutes/domain, no reliable historical start time; SAF success callback unverified | BLOCKED |

Source evidence does not constitute actual sound listening, screenshots, device-UX testing or reproduction. No screenshots or real Android measurements were produced here.

## 5. PR conflict matrix and ownership

| PRs | Relationship | Collision management |
| --- | --- | --- |
| #1 | recovery Draft to main | coordinates central files; direct main merge prohibited |
| #2 design/locale | open Draft; work already consumed by merged #9 | shared central language and markup owned by 00 |
| #3 focus/audio | open Draft; already consumed by #9 | audio catalog and native integrations need #12 coordination |
| #4 tasks | open Draft; already consumed by #9 | isolated tasks modules; timer/storage wiring owned by 00 |
| #5 notes core | open Draft; already consumed by #9 | standalone; stable numeric IDs |
| #6 analytics | open Draft; already consumed by #9 | analytics_studio.js directly overlaps #12 |
| #7 notes UX | open Draft; already consumed by #9 | editor/drafts; coordinated journal protocol |
| #8 QA | open Draft; earlier QA consumed by #9 | dedicated QA files; central smoke owned by 00 |
| #9 | merged into recovery c956bd19 | do not duplicate cherry-picks |
| #10 | closed without merge | obsolete duplicated integration |
| #11 | merged into recovery 632ef51 | baseline includes legacy save improvements |
| #12 | open Draft, NOT MERGED | app.js, index.html, integration_v22.js, MainActivity.java, analytics_studio.js, MEDIA_LICENSES.md, central tests. Blocks ar/fa/ur; preserve safe fixes only with review |

Exclusive lane-00 ownership: app.js, index.html, integration_v22.js, preflight_v22.js, MainActivity.java, central translation files, workflow, central smoke. This branch changes NONE of these. NO force push, reset --hard, user data mutation, permission change, license approval, signed release, Google Play publication or merge to main.

## 6. Priorities and support constraints

P0 TESTED (source only): live SHA, contract shape, synthetic mirror/backup/rollback checks, matrix and scoped branch.
P0 BLOCKED: actual ZEN21:: on phone and offline disposable restore; local Gemini worktree preservation; Android/WebView version and disk; screenshots; PR #12 language and export mismatch; actual audio provenance/device.
P1 TODO (other lanes): interactive 100-target touch QA, Notes/Tasks UX and restoration, analytics review, all-locale screenshots, accessibility.
P2 DEFERRED: noncritical design polish until P0 recovery safety is proven.

Android project: package/applicationId com.zenstudy.focus, minSdk 24, targetSdk 36, compileSdk 36, versionCode 21, versionName 21.0.0, androidx.webkit dependency 1.10.0 (this is NOT the installed Android System WebView version). CI: ubuntu-latest; Java 17; Android API/build-tools 36; Gradle 8.11.1; verify timeout 25 minutes. Cannot derive phone OS, WebView engine, screen resolution or free disk from these specs.

## 7. Reproducibility, logs, files and handoff

Source access: GitHub repository/issue/PR/branches/contents/CI connector, no phone worktree access. Container tool versions: git 2.47.3, node v22.16.0, Python 3.13.5. Sandbox git ls-remote could not resolve github.com DNS; used connected GitHub operations, never a force push. Extracted existing debug APK web JavaScript into temporary local fixture (not user data). An initial disposable local test attempt returned 14 PASS / 1 FAIL because the test helper wrongly overwrote intended v20 with v21; after fixing the test fixture (not app code), 15 PASS / 0 FAIL. This does not establish on-device compatibility.

New scoped test files: tests/recovery_baseline/v21_safety.test.cjs (15 focused assertions), tests/recovery_baseline/__init__.py, tests/recovery_baseline/test_v21_safety.py. The Python unittest-discovery adapter runs Node tests inside existing workflow WITHOUT editing workflow file. Run from repo root:
    node --check tests/recovery_baseline/v21_safety.test.cjs
    node --test tests/recovery_baseline/v21_safety.test.cjs
    python3 -m unittest discover -s tests -p 'test_*.py' -v
Commit-final scoped suite must be confirmed by actual PR CI before remote PASS is claimed.

Expected device evidence process (not yet executed): create true user-controlled ZEN21:: export on user's handset before any changes; verify export readability and integrity, use a completely disposable dataset/app profile for restore and failure-injection; preserve original app data. Record Android release, actual installed WebView version, resolution, available space, nonpersonal screenshots, and sanitized errors. Never publish a user's backup, session notes, IDs tied to account, or private contents.

Gemini local preservation: previous user session mentioned a local fix/gemini-quality-recovery branch, but it is not present among inspected GitHub heads. That is NOT proof the branch is absent locally or pushed. A phone operator must inspect clean/redacted git status --porcelain=v1 -uall, git worktree list --porcelain, git branch --show-current, git diff --stat and git log -1 before interacting with the Termux checkout; leave local changes and untracked files untouched. Do not install an unsupported Gemini CLI build or use sudo, forks or curl | sh.

License disposition: NO new audio files downloaded, converted or approved. docs/MEDIA_LICENSES.md remains a release blocker. Human GitHub review required before any merge, signing, permissions, license or backup policy change. The coordinator 00 can accept this report and its isolated tests independently of feature work; actual device backup/upgrade/media QA remains BLOCKED. **NOT PRODUCTION READY.**
