# TRACK 17 — verified performance and offline evidence (2026-10-21)

## Source provenance and ownership

- Branch: `audit/track17-performance-offline-20261021`; draft PR #166 targeting `integration/master-recovery-20261021` (PR #138), not `main`.
- Immutable pre-fix production source: `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5`.
- First Android 11 baseline evidence: [Actions 39601778974](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39601778974), artifact 12347245329.
- Fully optimized app source at `c78a020af431c966f041a261a775fff3cea56f6c`. Document/QA changes later than that SHA do not alter its production app code; refer to final PR HEAD for exact-SHA CI receipts.
- Historical performance PR #29 already supplies candidate windowing, latest-only scheduling and lifecycle helpers, but those are not wired to the app. Do not duplicate or cherry-pick them.
- PR #138 changes `app.js` and media/locale files; Track 17 changes **only** `analytics_recovery_core.js` in production. Notes/Tasks/Timer/Audio/DOM, v21 schema/keys, user records, Android package ID, minutes attribution and permissions are untouched.
- **RELEASE_APPROVED=NO**. This document distinguishes synthetic source, real Android WebView, and unverified product/lifecycle cases.

## Proven RED -> GREEN optimization

**Reproduced:** On actual Android API30 emulator WebView Chrome 83, 10,000 read-only synthetic focus sessions took 120.6 ms median / 212.8 ms p95; 9/9 synchronous report calls exceeded 50 ms. The old implementation repeatedly called date parsing/formatting inside array filters and per-session weekly aggregation. This code lives in the standalone read-only Analytics Recovery Core, not in the timer or persistence adapter.

**Scoped repair:** Hoist invariant day ranges outside the filters, cache calendar date validation and week-start calculation **only within the current report**, without persisted cache, source mutation or schema changes.

**Exact behavior acceptance:** [Node CI 39604087655](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39604087655) ran 11/11 source tests and 45/45 baseline-versus-candidate deep JSON and byte-for-byte CSV comparisons, including 10k rows, conflicting duplicate IDs, rejected samples, invalid dates, multiple domains, goals and different date ranges. All outputs and input records matched; source still counted 10,000 accepted sessions and 250,000 real credited fixture minutes in the clean case.

### Synthetic domain core (same Ubuntu runner, 9 samples, ms)

| Operation | Baseline median | Optimized median | Baseline p95 | Optimized p95 |
| --- | ---: | ---: | ---: | ---: |
| Notes search, 5,000 | 2.722 | 2.707 | 5.601 | 2.884 |
| Tasks search, 1,000 | 0.337 | 0.326 | 0.774 | 0.795 |
| Analytics report, 10,000 | **77.332** | **8.224** | **86.995** | **9.215** |

This is an 89.4% median reduction in Node, not the Android device result. Measurements include process-wide CPU/memory observations but neither prove nor disprove leaks.

### Real Android WebView (fresh disposable emulators)

| Metric | API30 / Android 11 before | API30 / Android 11 optimized | API35 / Android 15 optimized |
| --- | ---: | ---: | ---: |
| WebView Chrome major | 83 | 83 | 124 |
| 5,000-note search median | 37.5 ms | 5.6 ms | 25.7 ms |
| 1,000-task search median | 1.2 ms | 1.3 ms | 0.2 ms |
| **10,000-session analytics median** | **120.6 ms** | **6.3 ms** | **37.0 ms** |
| Analytics p95 | 212.8 ms | 15.0 ms | 72.7 ms |
| Analytics synchronous calls over 50ms (9 trials) | 9 | 0 | 3 |
| Seven offline DOM navigation destinations | 7/7 PASS | 7/7 PASS | 7/7 PASS |
| Cold Activity TotalTime samples | 1284,1080,898 ms | 1490,796,1098 ms | 2147,4471,2745 ms |
| Warm return WaitTime samples | 38,12,35 ms | 37,106,75 ms | 212,131,334 ms |
| Cold-start app PSS samples (KB) | 88788,88737,88691 | 90657,92379,90422 | 88945,78371,75126 |

Android API30 optimized [Actions 39604088047](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39604088047), [artifact 12347987466](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39604088047/artifacts/12347987466). API35 optimized from same run, [artifact 12348401065](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39604088047/artifacts/12348401065). These samples are actual Android WebView `performance.now()` around production core calls, *not* synthetic Node timing or real data persistence.

The API30 before/after samples use matched emulator API/WebView profiles but separate runners, not a strict paired hardware run. The API35 p95 still contains three calls over 50ms. The measured Activity launch `TotalTime` is **not** full WebView-ready paint or frame performance; PSS values are process memory snapshots after fresh restarts, **not** a memory-leak test.

Initial API35 run failed because an Android notification permission dialog became the foreground Activity instead of the app. The disposable emulator runner now grants notification permission on API33+ and the probe rejects redirected launches or missing processes, ensuring no false startup PASS. Neither production manifest nor user device permissions changed.

## New tests and commands

```sh
node --test tests/performance_recovery/*.test.cjs
node tests/performance_recovery/asset_audit.cjs
node tests/performance_recovery/track17_benchmark.cjs . 9
# In two exact source checkouts named baseline and candidate:
node tests/performance_recovery/track17_analytics_parity.cjs baseline candidate
# Only on a dedicated test emulator/device, not during a real focus session:
bash tests/performance_recovery/android_metrics_probe.sh evidence/android
```

Workflows: `.github/workflows/track17_synthetic_core_perf.yml` and `.github/workflows/track17_android_webview_perf.yml`. The latter compiles a debug APK, launches disposable API30/API35 emulators, disables their Wi-Fi/mobile data, probes the actual bundled WebView, captures three cold and warm launches and PSS/CPU, and uploads artifacts even on failure. No real user's v21 data is touched by the synthetic 5k/1k/10k benchmark.

## Evidence matrix and unresolved acceptance gates

| Requirement | Evidence state | Limitation |
| --- | --- | --- |
| Large-domain search/report correctness (5k/1k/10k) | PASS, Node + Android WebView JS core | Not large rendered DOM, user records, or end-to-end database |
| Exact analytics values/dedup/minutes/CSV | PASS, 45/45 source comparisons | Native SAF CSV dataset readback NOT_TESTED |
| Android API30/API35 startup and PSS/CPU capture | PASS for instrumented emulator capture | Not full content paint, physical battery/CPU, or process lifetime leaks |
| Seven-screen offline DOM navigation | PASS (7/7 per Android emulator) | Synthetic DOM click; actual physical touch and offline full section functions NOT_TESTED |
| Timer/Audio/DOM leaks after repeated background/foreground | NOT_TESTED | Requires memory/handle sampling across prolonged real cycles |
| Background, force-stop, restart with user data readback | NOT_TESTED | Probe exercises process restarts, but does not validate real restored notes/tasks/seconds |
| Low memory, storage full/quota and network-loss transaction | NOT_TESTED | Disposable phone/emulator, rollback and ACK verification needed |
| Old/new WebView audio focus, genuine audio endurance | BLOCKED / NOT_TESTED | Known screen-off audio underruns must remain a release gate |
| 320px/RTL/IME full rendering and 20-language behavior | Source + independent browser CI passed | Actual Android tactile E2E remains necessary |
| Latest PR HEAD full release/security/media readiness | BLOCKED | Independent review, real data durability, audio licenses and release gates still open |

## Merge decision rule

**Do not merge just because the Node suite and isolated emulator benchmarks are green.** Merge of this draft PR into the PR #138 **integration branch** requires:
1. Independent source/Android review on its latest exact HEAD and no hidden overlap with the current integration/Analytics owner.
2. Proven functional correctness with real Android offline interactions, v21 restore/readback and background timer, plus the outstanding lifecycle/leak/low-storage tests relevant to this track.
3. No discarded failed/NOT_TESTED evidence and no changes to the minute-count algorithm.
4. Explicit owner approval and separate release sign-off; no automatic `main` merge.

Remaining work should be handed off as explicit blockers rather than claimed as success or bypassed.
