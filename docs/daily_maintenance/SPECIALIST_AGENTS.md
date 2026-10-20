# Deep Focus specialist agents — 2026-10-20

## Operating decisions (from recovery Issue #13, PR #25 and automation PR #45)

- Preserve all 20 UI locales, including ar/fa/ur. Arabic content belongs in Arabic UI; do not force English or delete user-authored text.
- **All generated numbers** must use Western digits 0–9 in all locales. Do not touch personal note/task text, stored IDs, v21 backups, or original content.
- Do not rename Android application ID `com.zenstudy.focus`, keys `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21`, or `ZEN21::`.
- No force-push, autonomous merge, production signing, Play deployment, unlicensed media, speculative translations, migration, or broad automated code rewrites.
- Existing recovery branches/PRs own active app code. Automation is isolated; automatic repair scope remains the **approved generated CSS file only**, as defined in `maintenance.cjs`.
- GitHub Actions `schedule` triggers only after the automation workflow is reviewed and merged to **default branch `main`**. A draft PR is **not** a running unattended schedule.

## Jobs

**Two daily scans**: 02:17 and 14:17 UTC (05:17 and 17:17 Asia/Amman). Friday 01:47 UTC additionally creates a disposable **debug test APK**; never a store release. Cron timing is best effort (GitHub may delay or drop runs).

12 independent, configurable source-test agents in `tools/daily_maintenance/agents.json`:

| Lane | Specialist |
|---|---|
| locale | Localization: 20 languages, keys, RTL, live state |
| numerals | Generated Western digits, CSV and number invariants |
| ui | Navigation, buttons, touch and screen transitions |
| notes | Notes, drafts, retention and conflict safety |
| tasks | Tasks, persistence and subtasks |
| analytics | Counters, charts, filters and summaries |
| timer | Focus timer, lifecycle and alerts |
| audio | Offline natural sounds, sound picker and mixer |
| security | WebView injection and local-data protection |
| data | v21 compatibility, import/export, backups |
| performance | Offline startup and larger datasets |
| qa | Layout, product consistency and regression suites |

When scheduled, **all agents** run. On manual `workflow_dispatch`, choose a lane to run targeted tests. All calls use the installed Node runtime with `shell:false`, fixed 120-second child timeouts, path allowlisting under `tests/`, no execution of test commands from configuration, and no network-dependent AI services. New screens/tests can be added by extending existing suites or by reviewed additions to `agents.json` without editing orchestration.

Every run reports exact source SHA, status (`SOURCE_TESTED`, `BLOCKED`, `NOT_TESTED`, or `NOT_RUN`), test file counts and reasons; JSON and Markdown go into 3-day artifacts and the single updating QA issue. Any test failure blocks safe repair PR creation. Successful source tests **do not** establish Android/device PASS.

Translation audits separately report **missing explicit translations, unresolved markup keys, unmarked display strings and English-identical candidates**. The latter require native-language review, not automatic dictionary substitutions. Missing audit output is `NOT_TESTED`, never a green score. Tests also check generated numerals, but full Android UI/CSV coverage still needs device evidence. Sound licensing is a separate **BLOCKED** gate until genuinely verified.

## Review and recovery

Use [GitHub Actions](https://github.com/moaz76943-creator/zen-study-focus/actions) to inspect evidence and re-run manually, and [Recovery Issue #13](https://github.com/moaz76943-creator/zen-study-focus/issues/13) to track root causes. [Automation PR #45](https://github.com/moaz76943-creator/zen-study-focus/pull/45) contains infrastructure only; app implementation PR #25 and successors must remain separately reviewed. Treat real Android/manual acoustic tests and data-recovery tests as release blockers until independently verified.

**History limitations:** These notes preserve engineering decisions extracted from the available project recovery backlog/PRs; this is not a verbatim archive of all private chats and does not import conversation text automatically.
\n## Quality trust & minimal permissions (2026-10-20)

The source checkout explicitly uses `persist-credentials: false` so unreviewed tests cannot read a cached push token; `GH_TOKEN` exists only inside the generated-CSS PR proposal step. Its `gh auth setup-git` executes **after** source verification and never during tests.

A source suite only receives `SOURCE_TESTED` when its Node TAP output contains at least one real passing case, no failures, no skipped or TODO cases, and a successful child-process exit. Empty/malformed test output is `NOT_TESTED`; partial coverage is `SOURCE_PARTIAL`, which blocks safe fix proposals. This is still **not** Android E2E evidence.\n
## No duplicated test work

The scheduled main QA stage executes standalone locale/smoke/CSS and Python checks. The specialist stage runs Node suites once through the 12-agent manifest. Current known Node source folders are explicitly assigned to agents, and any newly added `.test.cjs` folder not in the manifest is reported as `unmapped_tests: NOT_TESTED` instead of silently ignored. The specific media-provenance release test is not treated as a passing unit test: the separate mandatory audit executes it and records `MEDIA_RELEASE_GATE_BLOCKED`. Future test folders need one reviewed manifest mapping; no source code of the app is rewritten automatically.
