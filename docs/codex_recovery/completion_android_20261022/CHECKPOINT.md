# TRACK A — Android API30 exact-application-tree acceptance (2026-10-22)

PR185 tested head `1682d2fe72e2a90318c59ccc6200a1437602373d`, application source `51313589b5472fcc834aa5a10ccb3240c5c062bd`, Android tree `8aad19f04b1a844055ff1ddb6fccc74100f32075`. Real API30 run 39715266944: **9 PASS / 0 FAIL / 0 NOT_TESTED**; artifact 12398454503, debug APK SHA256 `f587cffdd1ad2e6c1402e46b80c45275b1606a31b71abc4f039874fab20b81f0`, identical built / installed / artifact bytes. Native cfg rejection and real force-stop timer session ID restoration PASS. RED: previous run39709802063 was 7 PASS / 2 FAIL; persisted timer ID lost. GREEN: independent fsynced native timer packet mirror and fail-closed replay on restart, separate from original six-family v21 native record. Native timers never alter existing v21 protected ACK format or package ID. Node RED/GREEN focused source suite + full consolidated and 100-locale admission gates PASS on tested head. PR184 SAF path remains independent and unmerged: 2 PASS / 0 FAIL / 4 NOT_TESTED, run39714551395. Android success is NOT a SAF approval. No release signing, main merge, physical device or production approval. **RELEASE_APPROVED=NO**.

---

# Completion/restore/SAF/Android batch — 2026-10-22
RELEASE_APPROVED=NO.
Verified integration HEAD8b0a8ba238454df5b51e3563af43cd2a1903e774 via API after
git fetch503; local exact object exists. Read origin/main AGENTS and latest
CURRENT_CHECKPOINT, previous batch receipts available in conversation/GitHub.

Task1: normal finalize requires terminal snapshot acknowledgment and successful
next-mode selection before chime. Refusal retains credited ID for idempotent retry;
training path from181 unchanged. RED18 FAIL, GREEN18 PASS, focused132 PASS,
startup/syntax/diff PASS. Tests execute actual credit/writer/selector/finalizer.
Owner: existing integration_recovery qa. No schema/key/credit algorithm changes.
Commands: node --test tests/integration_recovery/normal_timer_completion.test.cjs;
timeout45 node --test same plus activity_transition_durability.test.cjs,
timer_credit_durability.test.cjs, tests/track05_timer/*.test.cjs and
tests/timer_native_bridge/native_timer_contract.test.cjs; timeout40 node tests/smoke_app.cjs;
node --check app.js; git diff --check.
Reviewed normal finalizer only; no repeat of176–181 repairs. Rollback scoped revert.
SOURCE_PASS; Android/SAF/device NOT_TESTED. Publish/review/integration-only merge,
verify SHA and receipt before Task2. User explicitly authorizes sequential merges.

Task1 merged PR182:8d26ea3a4b88213643951381e101b15f7d618297, receipt on GitHub
before Task2. Task2 based exactly on that merge.
Task2 RED4 FAIL/5 PASS -> GREEN9 PASS; focused141 PASS; smoke/syntax/diff PASS.
restore now clears previous interval/running/target before applying valid snapshot,
uses paused icon unless running, and retains full saved label (previously cut100).
Real loader/writer/restore/validator/credit tests cover paused/live/expired,
training rounds, task7 binding, idempotent credit and no repeated expiry chime.
Initial fixture omitted actual tasksList, causing2 false task-link failures;
added real synthetic task7, then reran baseline RED before production fix.
No stored packet rewrite for live/paused restore. No v21 format/key change.
New suite owns existing qa directory. Commands: node --test timer_reopen_durability
plus Task1 focused suites; source smoke/syntax/diff. Final paused-icon assertion
and focused reopen9 rerun after final UI change; no unrelated suite repetition.
Reviewed restore-only source diff. Rollback scoped revert. SOURCE_PASS;
Android/process-death/power-loss NOT_TESTED. Next publish/review/integration merge,
verify receipt before SAF work. RELEASE_APPROVED=NO.

Task3 isolated PR184 commit1a9c3b8cf46afa39cb008bfb56126ee007e639e6;
SOURCE_PASS18, actualAPI30 run39709234659 pending. Checkpoint comment6330933481
recorded before preparing Task4; no unproven SAF merge. Old159 is not current proof.

Task4 QA-only candidate on integration0b517904dec1c85be97b82a29db380e4649d9f6f.
APP_SOURCE_SHA pin checked against HEAD:android before build, actual installed APK
hash and QA SHA recorded separately. Reuses prior local-only CDP/native UI/ADB
helpers, real app-owned confirmations accepted/cancelled by UIAutomator, real
bridge/AtomicFile cfg ACK IO rejection, mocked timer save refusal, actual live
WebView controls/functions and force-stop/reopen. Checks prior synthetic task/note
IDs/unknown fields, same task completion exactly once, domain/sport/training,
StartPause/Reset/mode/custom/reopen/completion. Physical handset/TalkBack/audio
quality and power-loss not certified. Dedicated disposableAPI30 job,25min timeout,
300s probe bound, no signing or release. No production app change in this QA branch.
Coverage/attestation contract RED1 FAIL/1 PASS ->GREEN2 PASS; syntax/bash/diff PASS.
Probe exits1 with bootstrap NOT_TESTED when no disposable emulator, never fakePASS.
One paused-reopen test compares persisted fields and expects target=null: pause's
old transient target is intentionally not persisted. No unrelated test reruns.
Await exact-head Android result; keep PR isolated on FAIL/NOT_TESTED. If SAF passes
and is admitted later, repin/retest changed final application tree before claiming
acceptance. No main/package/data/schema changes. RELEASE_APPROVED=NO.

Task4 actual API30 run39709802063 completed FAILURE:7 PASS /2 FAIL.
Tested QA56ea654098f7647b940cf151052e630573271e2e;
application0b517904dec1c85be97b82a29db380e4649d9f6f;
android treea9d8f7934d9a5852d6208938ca3fe3e655e2c03d.
Downloaded actual APK checksum matches installed receipt:
4f9a05ee95f54f437b4502cb4d9766353f70b82107d9753d44c04856fd537c05.
PASS: native baselineACK, StartPause/service creation, Reset cancel/reject/retry,
activity/sport cancel/reject/retry, training cancel/reject/retry, completion credit
retry exactly once, prior synthetic tasks/notes/unknown fields after restart.
FAIL1: native cfg IO test cleanup rmdir reports missing .new directory; cleanup
masked the primary result. Cannot certify native IO refusal from this case.
FAIL2: custom running session ID becomes null after force-stop/reopen. Actual
reopen gate not met despite source restore tests. No unexpected startup JS error
in captured log; the logged TIMER_SAVE_NOT_ACKNOWLEDGED came from intended fault
injection. Evidence does NOT isolate async WebView disk flush vs startup overwrite;
auxiliary timer remains outside six-family nativeACK. Do not speculate or extend
native schema without a new RED proof. Next bounded diagnostic: raw timer packet
and epoch/ID before stop, after actual reopen, and trace initial timer writes.
Source-only readiness is not Android readiness. PR185 remains Draft/unmerged.

Task3 PR184 remains unmerged with actual gate failure recorded in its own branch:
2 PASS/1 FAIL/3 NOT_TESTED, run39709234659, artifact12395639341. No SAF change in
final integration. Its docs-only evidence head30f07b017648bee947b2bc241e9a4cfaa84f39b8.
Both failed gates preserved before ending batch; no indefinite rerun, no successful
same-SHA test repetition. Final integration remains Task2 mergedSHA above.
SOURCE_PASS for Task1/2, ANDROID_FAIL for acceptance; SAF path NOT_TESTED/FAIL.
main/package/permissions/signing unchanged. RELEASE_APPROVED=NO.
