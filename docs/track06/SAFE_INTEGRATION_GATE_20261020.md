# TRACK 06 — Safe integration gate (review-only, 2026-10-20)

**GATE: BLOCKED — NO CROSS-PR INTEGRATION. RELEASE_APPROVED=NO.**
This is an audit/handoff document, not an Android implementation or production approval. The review branch was forked from one immutable source commit and does not import any other PR.

## Exact baseline
- Repository: moaz76943-creator/zen-study-focus (public).
- Source SHA: 3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8, PR #70 (OPEN/DRAFT; base PR #66 SHA bd6e3e4d8aef95def871c9e7f78c63807e681369).
- Branch: review/track06-gated-checkpoint-20261020.
- Git ancestry proven through compare: PR #25 head be890c7487ba042af12b764a1a211fe7beed2a4e, PR #52 head 534912ce2d90d8988981c7d32e8bcb69671003f0 and PR #66 head bd6e3e4d8aef95def871c9e7f78c63807e681369 are ancestors of selected SHA.
- No main merge, force push, v21 schema mutation, migration, media enablement, Android package change, new permission, production build or signing.

## TRACK 00 P0 gate — exact evidence, not inferred acceptance
- New Android durability boundary: v21 six-slot primary/mirror snapshot; Java ZenNative.acknowledgeDurableV21 uses private AtomicFile + fd sync; preflight replay validates acknowledged checkpoint. Preserve its serialized bytes and existing keys.
- Source+Debug workflow 39376606049 at exact SHA: **SUCCESS**, 584 Node PASS / 0 FAIL, 31 Python PASS, Debug build SUCCESS. Source job: 118476041147; Debug build: 118476112590. Artifact IDs: 12243667316 source evidence and 12242634537 debug APK.
- Android workflow 39376600969 at exact SHA: **FAILURE** overall, job 118476026811; independently observed disposable Android API30 WebView/CDP subset **3 PASS / 0 FAIL / 17 NOT_TESTED**, including checklist immediate process kill/reopen and four further rapid-kill rounds. Legacy UIAutomator **0 PASS / 0 FAIL / 20 NOT_TESTED** because WebView HTML descendants were inaccessible. Artifact ID 12243577792 has installed-input APK and diagnostics (expires 2026-10-27). No physical owner device result.
- This supports **focused reproduction PASS**, not closure of the full data-loss P0 risk. Keep P0 OPEN pending Android fault injection and full reliability acceptance.
- Missing Android cases: native ACK failure, primary/mirror failure injection, multiple rapid toggles before one process kill, Activity recreation, Notes/Timer and cross-feature regression, ZEN21:: backup/restore, owner physical-device verification.
- Historic failing run 39368766119 (15 PASS, 1 FAIL, 4 NOT_TESTED) preceded the durability fix; do not misclassify it as a fresh failure of this SHA.
- Source fault-injection unit coverage is not equivalent to Android failure injection.
- Release still gated on audio per-asset rights/listening and complete locale audits (historical audit reported 4,608 missing locale/key pairs; remeasure at exact later SHA).

## Compatibility and anti-regression rules
1. Preserve exact v21 keys zen_fortress_cfg_v21, zen_fortress_tasks_v21, zen_fortress_notes_v21 and their _mirror counterparts; preserve v21 six-slot journal semantics; keep ZEN21:: import/export contract.
2. Preserve numeric record IDs, unknown user fields, actual focus history, Notes content/drafts, timer metadata, selected language, western UI digits 0–9 and user-authored text verbatim.
3. Preserve com.zenstudy.focus, Android package/signing/permissions, local WebView origin and all approved content. Do not remove or enable unlicensed media.
4. Never replace a shared app.js, index.html, integration_v22.js, MainActivity.java or localizations wholesale from an older branch. Review hunks against *latest* reference; one integration owner resolves shared-file changes.
5. A green mergeability flag is not a clean content conflict analysis; a green source CI is not real Android acceptance. No cherry-pick of an ancestor commit.
6. Protect 20 supported locale selections, RTL/LTR, ASCII/Western system numerals and existing functional buttons. No forced English or dropping ar/fa/ur.
7. Keep all specialist edits in separate branches and owned files. Never auto-merge main or overwrite concurrent work.

## Verified overlap decisions
- PR #68 changes two files identical by Git blob SHA on candidate #70: .github/workflows/verify_draft_20_locales.yml (aec4c5a324c9d2bc540a9eda1aec3d0fc8d8a345), tests/notes_recovery/draft_sdk_workflow.test.cjs (efef3037703ad6c6ada41d126cc93199663d704a). Its *commit ancestry* diverges: do not merge it again.
- PR #37's docs/control-center/repo-sync-core.js is NOT PRESENT at candidate SHA. This independent dashboard feature must be explicitly reviewed later; absence does not license a wholesale rollback of dashboard files.
- PR #59 nature-audio intake QA diverges; original Nature V2 inventory exists in base PR #66, but QA/provenance and commercial activation are separate gates.
- PR #71 security tooling was reported blocked by one potential generic-api-key Gitleaks match. Value not printed or copied. Hold for private classification; do not bypass.
- PR #65 hourly PR agent and #67 merge-conflict mapper remain independent infrastructure proposals; no default-branch automation activation during this checkpoint.
- #44/#47/#50 and older app/QA PRs overlap with files in selected source; shared paths alone prove neither containment nor safe merging. Compare exact hunk and behavior before any port.

## Required release/integration sequence AFTER P0 closure only
1. Recheck live heads of PR #70 and all affected PRs; freeze new full baseline SHA and verify protected contract.
2. Re-run real Android durability fault scenarios and assert old/new snapshot and both mirrors; classify PASS/FAIL/NOT_TESTED without masking failures.
3. Prove real device Notes/Tasks/Timer/backup/restore, locale switch, analytics controls, sound background handling, Android process death and Activity recreation.
4. One surgical patch at a time on an isolated candidate branch; capture exact per-file diff and three-way conflict evidence; no blind whole-file replacement.
5. On *the resulting unified SHA* run all Node/Python/JVM/static tests, Chromium responsive UI, Android API30+ WebView E2E and integrity/locale/audio gates. Any unrun required case remains NOT_VERIFIED.
6. Human review and final data safety sign-off before changing any PR readiness; **never merge to main automatically**.

## No integration in this checkpoint
The only permitted write in this branch is review documentation under docs/track06/. No source, UI, Android, workflows, v21 keys or user data are modified. Tests listed above were observed from PR #70's exact SHA; no new merged-source tests are claimed.
