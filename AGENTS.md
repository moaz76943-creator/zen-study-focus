# Deep Focus — repository agent operating contract

This file applies to all coding agents, assistants, reviewers and automation proposals working on this repository. Read it **before touching source**. It supplements, never replaces, the active user request and reviewed engineering decisions.

## Recover real context, never regress the product

1. Read `docs/daily_maintenance/SPECIALIST_AGENTS.md`, `docs/daily_maintenance/HOURLY_COORDINATION.md`, the active engineering specification in [Issue #13](https://github.com/moaz76943-creator/zen-study-focus/issues/13), and relevant open PRs.
2. Discover the actual default branch, the latest active integration chain, existing worktrees, latest head SHA and existing checks. The app source may be on a staged branch while `main` contains QA infrastructure. Never blindly replace a newer feature with older code because an old SHA has green tests.
3. Before creating an issue or PR, look for the same bug or overlapping owner. Avoid duplicate work, cross-branch cherry-pick loops, broad rewrites and merging independent draft PRs without integration review.
4. A changed goal or a new user-requested feature is a feature to preserve: update behavior contracts, tests, relevant localization keys and the QA-agent ownership manifest. Never 'fix' failing tests by removing the feature or suppressing the assertion.

## Clear engineering ownership

- **Triage:** reproduce problems, identify exact source SHA and affected functionality.
- **Repair:** red → green → refactor; implement the smallest change in a short-lived branch.
- **Independent critic:** check screen-level behavior, regressions, missing E2E, inaccurate reports and old-feature preservation.
- **Localization:** all 20 UI languages, RTL/LTR, actual contextual translations and Western 0–9 *generated* digits; preserve user-authored text.
- **Android interaction:** on-device/emulated WebView touch, back navigation, reopen, lifecycle, persistence, timer and notifications, distinct from Node mocks.
- **Audio/provenance:** real nature recordings, player and mixer function, honest empty/failed state, offline playback and per-asset commercial licence evidence.
- **Data protection:** v21 backup/readback/import/export integrity and no silent user data loss.
- **Release quality:** exact-SHA verified source checks, genuine Android evidence, media rights and explicit manual approval.

Role guides: `.github/agents/*.agent.md`. Deterministic rotating source-test specialists: `tools/daily_maintenance/agents.json` (currently 12), with coordination in `hourly_orchestrator.cjs`. If a test is added, assign it to **one** owning suite/agent and test neighboring functions for regressions. A missing or duplicate owner is a coverage defect.

## Protected invariants

- Android package ID `com.zenstudy.focus`; v21 keys `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21` and backup marker `ZEN21::`.
- Preserve all current working screens, completed features, achievements, personal notes/tasks, analytics records, existing export formats and all 20 selected UI languages.
- Nature sounds require genuinely verified source recordings and licences, including redistribution rights for commercial apps; never assume random Ogg files are authentic.
- No force push/reset, automatic merge to main, signing or publishing, deleting tests to obtain green CI, editing user data, unreviewed migrations, sensitive permissions or unlicensed downloads.

## Mandatory flow for every repair

1. Establish the current feature intent and ownership; capture the exact source SHA.
2. Write and run a failing regression test (RED) before the fix; record failure evidence.
3. Apply the minimal scoped change and run the focused test (GREEN), existing suites, plus real Android E2E if relevant/available. Classify unavailable checks as NOT_TESTED, not PASS.
4. Review neighboring screens and relevant locales; preserve previous behavior and persisted data.
5. Publish a **draft PR** with reproduction steps, before/after SHA, passed/failed/missing checks and safe rollback. Reviewers decide merger. No production release until its own gates pass.

## Honest automation boundaries

GitHub Actions hourly jobs rotate bounded **source checks**, not a remotely hosted, autonomous reasoning model. The cumulative issue ledger may report `FULL_SOURCE_CYCLE_PASS` only when all specialists have fresh, exact-SHA evidence; this still does not certify Android or release. The separate ChatGPT hourly task or a connected coding agent can diagnose and propose improvements, but must respect these same rules and must not claim an unexecuted action succeeded.

Use the current source and GitHub evidence, not stale conversation instructions, as authority for moving code. If evidence is insufficient, document a blocker and the smallest verifiable next step.
