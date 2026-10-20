# Track 08 — Independent PR #75 Android validation

**Date:** 2026-10-20 (UTC)  
**Independent review base:** PR #75 `915e5f606cefeacee5e76994b8fc5eb944b71bae`  
**Upstream canonical review:** PR #73 `a5d557813c4fa9bd0209e1a12d563e84a7064d56`  
**Status:** EVIDENCE COLLECTION / NOT RELEASE APPROVED.

## Rationale
PR #73's full Android API30 workflow 39392900301 executed 15 ADB/CDP cases successfully and recorded five NOT_TESTED. In `task_subtasks`, an intermittent physical UIAutomator hierarchy dump failure prevented finishing a durable post-kill assertion, even though pre-failure child/checklist state was observed. PR #75 added bounded fresh-hierarchy retry; its local five unit tests passed, but no Android Actions job was associated with its HEAD when inspected.

## Isolated execution
This audit branch is a fast-forward child of **PR #75**, not PR #73 or `main`. It changes no Android application code, manifests, signing, stored data, release config, localization, media or agent implementation. The only execution edit is to add this precise review branch to the **existing debug-only disposable Android WebView workflow push allowlist**, with a focused hierarchy-helper test invocation. No production permission or automatic release is added. Intended single source SHA is the final commit containing both this report and the workflow allowlist; recheck it after push.

## Independent acceptance claims
- A source-unit PASS is NOT Android runtime evidence.
- A workflow FAILURE may be caused by a transport BLOCKED/NOT_TESTED, not an application FAIL.
- The retry must not reuse stale WebView geometry or turn failed hierarchy reads into PASS.
- `task_subtasks` can be marked PASS only after the actual immediate process kill and verified post-restart state.
- Count unexecuted scenarios as NOT_TESTED. Do not collapse the legacy UIAutomator 20-case transport suite into the instrumented CDP results.
- Capture exact source SHA, installed input APK SHA256, WebView/API version, executed cases, native receipt and Primary/Mirror/journal state when the harness provides them. Do not invent absent measurements.

## Mandatory unresolved gates
1. Device-native fault-injection: ACK failure, primary/mirror failures, interrupted six-slot journal, five toggles then one immediate kill.
2. A genuine Activity destroy/recreate, real Android SAF ZEN21:: backup/export/import, and note/timer rollback and notification policy.
3. `touch_scroll`, `accessibility_smoke`, `copy_export`, `talkback` from the #73 unexecuted suite, and physical-device acceptance.
4. Rendered parity in all 20 languages; 4,608 source language/key gaps; 20 audio rights/listening approval.
5. Secure disposition of PR #71 Gitleaks potential match without printing secrets; release signing, version monotonicity and owner approval.
6. Final `07-09 FINAL_INTEGRATION_SHA` with complete same-SHA regression evidence before Phase B acceptance.

## Release gate
**RELEASE_APPROVED=NO**. No `main` merge, production release, signing changes, unauthorized media activation or permission changes. This branch is test infrastructure plus independent evidence only.
