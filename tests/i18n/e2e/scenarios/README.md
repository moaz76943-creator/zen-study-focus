# DF13-C — Functional Android E2E handoff (lane A)

Owned files **only**: `tests/i18n/e2e/scenarios/` and `tools/i18n/e2e/scenarios/`.
No production files, Android runner, workflow, source-coverage implementation, APK/signing files, or storage were edited. This is a stacked PR based on lane A's PR #267 head; lane A must first finish its Bash/Android runner fixes.

## Invocation by lane A (one APK per API, not one APK per scenario)

After lane A checks out the **combined head**, builds a *single* debug APK and installs it on a disposable emulator (API30 or API35), run:

```bash
python3 -m unittest discover -s tests/i18n/e2e/scenarios -p '*_test.py' -v
python3 tools/i18n/e2e/scenarios/functional.py \
  --output artifacts/i18n-e2e/api30/SCENARIO_MATRIX.json \
  --sha "$(git rev-parse HEAD)" --api 30
# Optional isolated case during debugging (does not start a build):
python3 tools/i18n/e2e/scenarios/functional.py \
  --output artifacts/i18n-e2e/api30/SCENARIO_MATRIX-digits.json \
  --sha "$(git rev-parse HEAD)" --api 30 --scenario digits.visible_labels
```

**Required:** preinstalled `com.zenstudy.focus` built from the same HEAD; existing lane-A `android_device.py` module and ADB/UIAutomator available. Fresh local test data only. Do not run destructive scenarios on a personal phone. Runner does **not** call `pm clear`, inject JavaScript, synthesize DOM or manipulate v21 storage keys. For a reliable full suite, initialize the emulator with a fresh install and English default before running; language-switch scenario is near the end. A must upload the JSON even on failed execution, and include source/apk hash provenance in the same artifact directory.

## SCENARIO_MATRIX: currently implemented and gated

| Scenario | Runtime assertion | Initial status before Android execution |
|---|---|---|
| timer.start_pause_resume | Countdown decreases; pause stays fixed; resume decreases | NOT_TESTED |
| timer.reset_cancel_confirm | Cancel keeps elapsed progress; confirm resets and stops | NOT_TESTED |
| tasks.create_save_relaunch | Unique task absent before, visible after save and force-stop/relaunch | NOT_TESTED |
| notes.create_search_relaunch | Unique note title/body absent before, present after save/relaunch and search | NOT_TESTED |
| offline.relaunch_foreground | Disable Wi-Fi/data; cold relaunch and background/foreground title visible | NOT_TESTED |
| locale.switch_while_timer_running | Timer progresses before/after Arabic switch and process relaunch; AR locale persists | NOT_TESTED |
| quick_training.work_rest_stop | Work Round 1/8 => Rest Round 1/8 after real Tabata 20/10; confirmed stop hides phase | NOT_TESTED |
| digits.visible_labels | Enumerate Android-visible numeric labels, reject non-ASCII decimal digits | NOT_TESTED |
| tasks.edit / tasks.restore | Requires scoped editor and real SAF DocumentsUI state/consent adapter | NOT_TESTED |
| notes.edit | Requires accessible saved-note editor and body read-back | NOT_TESTED |
| goals.real_analytics | Requires completed actual session plus real v21 goal/analytics read-back | NOT_TESTED |
| audio.controls_settings | Requires actual playback signal, volume/state and persisted settings | NOT_TESTED |
| security.html_injection | Requires payload entry plus real DOM execution/text-content assertions | NOT_TESTED |
| validation.inputs / validation.destructive_consent | Requires invalid input and real destructive-record dialog state checks | NOT_TESTED |
| performance.tasks_1000 / notes_5000 / sessions_10000 | Requires validated real data import plus timing, memory, identity reconciliation | NOT_TESTED |
| accessibility.talkback / accessibility.rtl_visual | Require spoken output or pixel/layout acceptance | NOT_TESTED |

An attempted runtime check that raises `AssertionError` is `FAIL`; an unobservable state raises `NOT_TESTED` with a hook requirement; no inference from navigation buttons. A shell/UIAutomator failure is `FAIL`, not a `PASS`. Report JSON is checkpointed after **each** case and includes the complete list, failures and blockers. Executed cases run sequentially and use one installed APK.

## Safe fixtures (not proof of performance)

```bash
python3 tools/i18n/e2e/scenarios/fixtures.py \
  --output artifacts/i18n-e2e/fixtures
```

This emits bounded deterministic JSONL files: 1,000 tasks, 5,000 notes and 10,000 sessions, with `DF13C_TEST_ONLY_` IDs and `synthetic: true`. They are **not** directly imported into the app or treated as v21-compatible backups. Do not write to live app stores or bypass consent. Performance stays `NOT_TESTED` until lane A supplies a validated native/SAF import and actual Android benchmark evidence.

## REQUIRED_RUNTIME_HOOKS / blockers for lane A

1. Stable accessible record-scoped edit selectors and read-back for existing tasks/notes (legacy task list has done/delete but no proven Edit affordance).
2. Native WebChromeClient JavaScript confirm buttons and outcome observable by UIAutomator for reset/cancel/stop. Without these, cases remain NOT_TESTED.
3. SAF DocumentsUI consent, cancel/restore, corruption rollback with v21 checksum, source identity and post-relaunch checks; test-only data.
4. Real session completion/goal credit/analytics history probe; real sound playback/volume and settings persistence probe.
5. Safe HTML payload insertion + rendered DOM and execution observation; *not* mock HTML strings or source-only escaping checks.
6. Performance adapter using approved synthetic import, start/finish clocks, memory/PSS and accuracy comparison; representative API30/API35. Separate TalkBack speech and screenshot-based RTL visual acceptance.

The existing runner's `record()` and `DEVICE_MATRIX.json` are lane-A owned: this lane does **not** modify them. To integrate, lane A imports `scenarios.functional.run` or calls its CLI **after installing its one APK** and writes the standalone `SCENARIO_MATRIX.json` to the same artifacts directory. A must not claim these cases were executed simply because unit tests passed.

## Verification and caveats

Run unit tests with Python stdlib only; unit results prove contracts/fixtures, **not** device functionality. The scenario runner uses UIAutomator labels from the current checked-out app; any mismatch must be recorded as FAIL/NOT_TESTED with evidence rather than waived. The suite is non-release evidence until Android runs succeed. Failure cases must not be erased when compiling the report.
