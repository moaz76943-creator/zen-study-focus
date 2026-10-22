# TRACK A — Android API30 exact-application-tree acceptance (2026-10-22)

PR185 tested head `1682d2fe72e2a90318c59ccc6200a1437602373d`, application source `51313589b5472fcc834aa5a10ccb3240c5c062bd`, Android tree `8aad19f04b1a844055ff1ddb6fccc74100f32075`. Real API30 run 39715266944: **9 PASS / 0 FAIL / 0 NOT_TESTED**; artifact 12398454503, debug APK SHA256 `f587cffdd1ad2e6c1402e46b80c45275b1606a31b71abc4f039874fab20b81f0`, identical built / installed / artifact bytes. Native cfg rejection and real force-stop timer session ID restoration PASS. RED: previous run39709802063 was 7 PASS / 2 FAIL; persisted timer ID lost. GREEN: independent fsynced native timer packet mirror and fail-closed replay on restart, separate from original six-family v21 native record. Native timers never alter existing v21 protected ACK format or package ID. Node RED/GREEN focused source suite + full consolidated and 100-locale admission gates PASS on tested head. PR184 SAF path remains independent and unmerged: 2 PASS / 0 FAIL / 4 NOT_TESTED, run39714551395. Android success is NOT a SAF approval. No release signing, main merge, physical device or production approval. **RELEASE_APPROVED=NO**.

---

# Current batch receipt — completion/restore and Android gates

2026-10-22; RELEASE_APPROVED=NO.

Integrated source fixes: PR182 merge8d26ea3a4b88213643951381e101b15f7d618297;
PR183 merge0b517904dec1c85be97b82a29db380e4649d9f6f (current integration).
Task3 SAF PR184 isolated: API30 run39709234659 failed, no merge.
Task4 Android acceptance PR185 isolated: run39709802063 failed, no merge.
Actual APK/source receipts and detailed PASS/FAIL/NOT_TESTED:
completion_android_20261022/CHECKPOINT.md and TASK4_ANDROID.json.
Next: reproduce native timer ID loss with raw before/after packets on disposable
API30; fix SAF fixture selection and maxBuffer before asserting actual file restore.
No source PASS is Android PASS; failed gates must not be admitted. main untouched.

## Historical inherited checkpoint (superseded)

# Current continuation — activity/training P0 batch

2026-10-22. RELEASE_APPROVED=NO.

Task1 PR179 verified integration merge61a549f1751c2d373555476e8a4d13e828098940.
Task2 PR180 verified integration mergecc03d65ed0004b7c256eb34605b9ae0ae042fe1d.
Both receipts published on GitHub before starting the next task.
Task3 candidate: fix/p0-training-transitions-20261022, based on Task2 merge.
37 new training cases PASS; combined focused159 PASS; startup/syntax/diff PASS.
Commands, RED/GREEN, scope and limits: activity_training_20261022/CHECKPOINT.md.
User authorizes review and sequential integration-only merges; main untouched.
Final Task3 commit/merge SHA will be recorded in the PR receipt after publication.
Android/build/process-death/SAF gates remain NOT_TESTED; no release approval.

## Historical earlier continuation (superseded)

# Current incremental recovery checkpoint — mode/custom continuation

2026-10-22. RELEASE_APPROVED=NO.

Current candidate: `fix/timer-mode-save-failure-20261022`, based exclusively on
PR177 `8febb55ceca5623529060d091e506ff02bc3c799`, targeting PR177 branch.
Mode/custom snapshot consistency and direct Home caller only. Prior Reset,
Start/Pause, duration and water repairs remain intact.

Evidence/commands/scope/rollback: [mode_save_20261022/PROGRESS.md](mode_save_20261022/PROGRESS.md).
New cases23 PASS, neighboring suites87 PASS, startup/syntax/diff PASS.
Android, APK/AAB and broad heavy suites NOT_TESTED; no manual Actions dispatch.
Next action: manual review of the stacked Draft PR; no automatic merge/release.
Published commit and PR identifiers are recorded in the PR receipt, avoiding
self-referential commit hashes in this file.

## Historical inherited checkpoint (superseded continuation instructions)

# Current incremental recovery checkpoint

Timestamp UTC: 2026-10-22T00:20:56Z. Tasks: CROSS-001/002, DATA-024, TIMER-028/029; related Issues102/106. RELEASE_APPROVED=NO.

## Current source

- MAIN_SHA: `a552ec566d9089ff930df224fa80f03a8ef1aa3a`.
- INTEGRATION_SHA / application base: `d0116e69e67667b24a1689d621823d9823df2711`, PR138 still open/unmerged.
- Review branch: `fix/timer-toggle-save-failure-20261022`, existing draft PR176. Isolated worktree, no main or PR138 write.
- Composition: original timer Start/Pause repair `9a462d23a98944aebe96af9fcb75578d07e2e8f8`, duration repair `1ad7e04`, plus existing PR175 water repair `70f944d7460610882f1c4dd592989d5bb4160283`. Exact merged commit recorded in PR176 receipt after commit.
- Actual diff/ancestry reviewed: water action/test and timer functions/test affect separate hunks. Merge into this review branch had zero conflicts. No blind whole-file replacement or duplicate implementation. PR175 remains open as the original scoped review; no automatic PR closure.
- PR173 ownership patch is already implemented at `003461525045200f26a896203da5b18dcdf97959` but still unmerged; Issue69 COVERAGE_GAP cannot become a fresh full-cycle PASS until normal admission and exact-manifest evidence. Do not repeat the fix or mix main's app tree into PR138.

## Confirmed defects / implementation

1. Water count mutated live cfg before persistence; rejected ACK/write/readback then retry could overcount. Save a candidate, publish water only on true acknowledgment; failure retains memory/packets and displays existing translated save error. Original RED5 FAIL, GREEN9 PASS.
2. Start/Pause changed state/button/interval before snapshot save; rejected write left JS/native mismatch or a running flag without scheduled work. Stage, save, then publish scheduled/UI/native changes; restore prior identity/task/time on rejection. Preserve the exception so internal Reset/mode/training operations abort. Original RED6 FAIL, GREEN11 PASS.
3. Duration +/- rescheduled native and changed live durations before persistence. Now save first, restore three duration fields on rejection, reschedule/display only afterward. Added RED5 FAIL, final focused timer suite16 PASS. Existing ten-second floor and timer identity remain.

All changes retain v21 schema, keys/envelopes, unknown fields, numeric task/note IDs, generated-digit behavior, bridge, permissions/signing, locale dictionaries and media gates. Auxiliary timer snapshots remain outside the native six-family ACK, unchanged; do not claim new process-death durability.

## Evidence and limits

- Exact previously tested heads: PR175 `70f944d` CI SUCCESS runs39692935259 /39692935499; initial PR176 `9a462d2` CI SUCCESS runs39694007445 /39694007768. These are historical to the combined tree, not combined-head CI evidence.
- Combined source before merge commit:93 PASS /0 FAIL /0 skipped. Command: `timeout 45 node --test --test-reporter=tap tests/integration_quality/*.test.cjs tests/data_contracts/*.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/integration_recovery/native_durable_ack.test.cjs tests/track05_timer/*.test.cjs tests/track07_functional/timer_destructive_shortcuts.test.cjs tests/track07_functional/timer_mode_button_safety.test.cjs tests/track07_functional/timer_mode_20_locale_prompt.test.cjs tests/timer_native_bridge/native_timer_contract.test.cjs`.
- Combined startup smoke `timeout 40 node tests/smoke_app.cjs`: PASS; includes source-level20-locale/focus/training/backup/XSS/audio smoke. Syntax/diff PASS.
- Chromium before composition on duration-repaired tree:19 actual interaction cases PASS,0 uncaught errors at393px; not all232 buttons, Android or merged-head browser proof. See existing timer evidence document for exact command.
- Local synthetic logs: `/workspace/scratch/timer-delta/`, `/workspace/scratch/timer-toggle/`, `/workspace/scratch/water-ack/`. Production data never used.
- Android/physical device, force-stop, real SAF, Bluetooth/DND/locked screen, human media/licence/locale approval, current security scans, APK/AAB: NOT_TESTED in this session. No heavy workflow manually dispatched.

## Next exact operation

Inspect automatic CI on PR176's final exact head once, recording head SHA and any first failing step. Then schedule bounded synthetic Android failure/tap/retry acceptance when the existing QA lane is available. Reviewers decide admission to PR138. No main/staging merge or production approval occurred. Additional storeTimerSession callers, including full mode replacement/reset/custom-label persistence, remain separate review/test gaps; do not claim all timer failure paths fixed. Full197-task backlog remains open; this checkpoint covers only these three small repairs.
