# DF-ROOM-04 — resumable execution, 2026-10-27

RELEASE_APPROVED=NO. Canonical integration/master-qa-verified-v21; main must remain separate. Read live GitHub state before executing or merging; this receipt is historical, not a lock.

Latest integrated batch before this PR: #423, canonical c92b4c378a3b20a936f7d2caecd3e911cf7a8692. Water failed-ACK guard passed actual API30 touch at 320/360/393/430 (run40434768869, artifact12704171311); API35 emulator lost, application NOT_TESTED. Final canonical source207PASS and startup smokePASS. Earlier #424/#425/#426/#427/#428/#430/#447 already merged; #44/#70 already closed. #429/#431–#446 already merged: never redo.

## Current isolated CSV change

Analytics Export was disabled in Android because no native save adapter existed on canonical. This focused forward port adds correlated saved/cancelled/failed receipts, size-bounded UTF-8 output, post-close exact byte readback, UI-thread-free document IO and no v21 data writes. The existing CSV core owns formula protection/quoting/Western digits. Do not merge the historical application branch behind #130/#134: it contains obsolete application code. Only the #134 native DocumentsUI test was selectively reused and strengthened.

RED: three adapter tests fail on c92b4c37 (no native adapter). GREEN: adapter+Analytics73PASS; integration+adapter40PASS; actual Java writer11 fault casesPASS; startup smokePASS. Local JRE lacked javac, so local actual Java tests compiled with Eclipse ecj3.40.0 (Maven Central), CI uses JDK17 javac.

Android acceptance MUST inspect exact PR head and df_room04_csv workflow artifacts. Before successful native Cancel+Save+independent bytes comparison, label Android NOT_TESTED. QA instrumentation only changes build suffix, package guard, WebView debug and label; record diff/sourceSHA, require built=installed APK bytes. Production package remains com.zenstudy.focus. Only disposable QA data is seeded. Workflow is PR-path scoped plus dispatch: do not run unchanged duplicates. Do not call opening a picker a successful save.

## Blocked native durability (#417/#102)

#417 draft head03210b34812cc315e9747e32c10200a0ff5c9aaa predates #423 and this CSV work. Future recovery must refresh from canonical with ordinary merges and revalidate affected source before considering merge. Do not port broad #280. Preserve six v21 packets, existing Atomic active timer receipt, keys and ZEN21::.

Two causal API35 experiments failed to restore the emulator. Smaller renderer+host telemetry run40434209136: API30SUCCESS; API35 18PASS/0FAIL/12NOT_TESTED including bootstrap. Prior stable Emulator37.1.11/build15917651 actually installed in run40435565154: API30SUCCESS; API35 17PASS/0FAIL/13NOT_TESTED including bootstrap. Host availableRAM>10GiB; cgroup counters unavailable; bounded crash metadata reports=[] and no rawdump uploaded. Do not assert OOM or application bug from this. Do not repeat unchanged heavy CI. Need new guest/host termination evidence or functioning API35 environment. Independent disk-WAL proof remains NOT_TESTED. #417 not merged; #102 open.

## Remaining gates

Gitleaks remains FAIL/uncleared (#281/#107), not disabled; no actual service credential established, avoid logging findings. Nature20 recordings remain NOT_APPROVED pending rights/human hearing; no audio acceptance from decoding. Broad20locale UI translation acceptance, physical TalkBack/Bluetooth/background, low-storage, performance and final release gates unfinished. No99language acceptance claim. No store-ready signed AAB. Release stays NO.

Coordination source: #13/#64/#69/#293; batch receipts on #13 and relevant PRs. Keep issues open unless acceptance actually complete; retain historical branches. Update live PR comments with exact SHA, runs, PASS/FAIL/NOT_TESTED and next action after every batch so another session can resume without this workspace.
