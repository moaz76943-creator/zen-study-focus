# Deep Focus — coordinated agents and safe hourly automation

## What actually runs

- `.github/workflows/hourly_agent_orchestrator.yml` is a native GitHub Actions workflow, scheduled for minute 23 of each UTC hour, after it is merged onto `main`. GitHub schedules are best-effort, not a hard real-time guarantee. It also supports manual dispatch.
- `tools/daily_maintenance/hourly_orchestrator.cjs` selects at most 3 existing specialist agents from the reviewed manifest. With 12 agents, all are selected over a 4-hour rolling cycle. A 13th agent automatically introduces a fifth cohort without modifying the scheduler. Existing `daily_maintenance.yml` still performs full source audits twice daily and weekly debug-only builds.
- The same concurrency group prevents overlap with daily maintenance. Each run is pinned to the exact SHA checked out and creates a JSON + Markdown evidence artifact and updates **one** deduplicated GitHub issue, rather than flooding open issues.
- On schedule, source tests target `fix/master-completion-20261020`, matching the reviewed integration branch of the existing daily workflow; manual dispatch can inspect `main`. A new feature or new integration branch is not silently promoted: review and update the target in BOTH workflows. Do not compare newer integration work to older main and call it a regression.
- No cloud LLM, paid API, GitHub Copilot entitlement or AI API key is required to run deterministic source checks. `.github/agents/*.agent.md` are critical-thinking instructions for supported coding agents; their existence does **not** mean an AI agent is autonomously executed by this Actions workflow.

## Preventing new features from breaking old work

The manifest is an extension interface: new capabilities get owned test directories, which can be added to an existing agent or to a new agent (max 30). Discovery detects every new `.test.cjs` file. Unassigned tests and tests claimed by two agents cause a **COVERAGE_GAP**, not a fake PASS or an implicit removal of the new feature. New agent count changes rotation automatically, with source and test ownership kept separate.

Agents inspect real return values and outcomes, not superficial existence of buttons or strings. The queue prioritizes failures, incomplete tests and regression coverage; it never takes the shortcut of deleting a failing test or deleting an unfinished feature. Every proposed source change uses TDD, smallest-scope patches, independent critical review and draft PRs with manual merge gates.

## Boundaries and limitations

This hourly workflow **audits** source code; it does not generate arbitrary source code fixes. The separately scheduled ChatGPT engineering automation or a manually invoked coding agent can prepare reviewed fixes. Real installed Android/WebView interaction, natural audio quality, provenance/licences and professional translation suitability are **not** proven by Node tests. Run device tests and human/media audits for those gates.

No reset, force-push, main rewrite, auto-merge, release signing or publication, arbitrary media downloads, dangerous migration or personal-data alteration. The protected Android package ID, v21 storage keys, `ZEN21::` backups and all historical completed functionality stay intact.

## Day-to-day operations

1. Read the single `[Hourly QA]` issue or seven-day Actions artifact, checking the exact source SHA and cohort number.
2. `COHORT_PASS` means ONLY that the selected source suites passed; it does not mean all agents or Android passed. `BLOCKED` means selected tests failed or were incomplete. `COVERAGE_GAP` means new/unowned or overlapping source tests need a reviewed manifest mapping.
3. On feature addition, add deterministic tests, assign them in `agents.json`, extend cross-feature regression coverage, and let the hourly rotation discover the new manifest. Update the tracked integration ref only after its owner reviews it.
4. For a P0 defect, invoke `deep-focus-triage` then `deep-focus-repair` and `deep-focus-critic`; localization changes also require `deep-focus-localization` review. A coding agent can open a draft PR but must not auto-merge.

## Performance / billing

Each hourly cohort runs up to three groups instead of replaying all twelve hourly; runs have an 18-minute upper bound and no paid external model dependency. Hours on public GitHub-hosted repositories follow GitHub's current applicable Actions billing and abuse limits, which should be checked in repository settings. Do not assume infinite free compute.

## Cumulative quality evidence (hourly coordination v1.1)

The single Hourly QA GitHub issue now includes a schema-validated ledger combining rolling cohorts. Results are combined **only** when both the checked-out source commit SHA and the agent-manifest SHA-256 match. Any change resets previously passing evidence, and individual results expire after six hours, so missed schedules cannot count as passing tests.

Only when every registered agent has fresh SOURCE_TESTED evidence, and all ownership checks are clear, does the ledger report `FULL_SOURCE_CYCLE_PASS`. Otherwise it reports `INCOMPLETE` (missing or expired), `COVERAGE_GAP` (new or overlapping tests), `BLOCKED` (failed or partial) or `NOT_VERIFIED` (invalid current report). A green source cycle is **not** Android E2E, real sound quality, verified media licensing or production release approval.

The GitHub issue contains a machine-readable state; the issue-update step is the only step requiring issue-write permission. Damaged/out-of-order reports invalidate old green evidence rather than claiming success. No app-source edits or automatic merges occur.


## Current checkpoint — timer ownership review (reference2026-10-22)

Timestamp UTC: `2026-10-21T23:10:04.649472+00:00`. Scope: AUTOMATION-001–011 / PHASE1; resource-bounded review of existing PR173, not another implementation.

- MAIN_SHA: `a552ec566d9089ff930df224fa80f03a8ef1aa3a`.
- INTEGRATION_SHA: `d0116e69e67667b24a1689d621823d9823df2711` (PR138, application source).
- TESTED_AUTOMATION_SHA: `003461525045200f26a896203da5b18dcdf97959` (existing PR173). Automation lives on the main lineage; do not merge old main app code into the application candidate.
- WORKING_BRANCH: `audit/timer-owner-review-20261022`; checkpoint-only descendant of the tested automation SHA. Other existing worktrees/uncommitted work preserved.
- ALREADY_FIXED / FIX_AVAILABLE_NEEDS_INTEGRATION: PR173 adds only `tests/track05_timer` to the existing timer owner plus its regression; no replacement implementation. PR173 remains open/unmerged.
- RED reproduced from test-only parent `1c9a4c5bf616e59b96fd6b6f9e6f57b2de187429`: exact timer owner list was empty. Replayed original test in an isolated temporary tree; original checkout untouched.
- GREEN/NEIGHBORS:35PASS/0FAIL using the existing coverage, quality_agents, hourly_orchestrator, hourly_ledger and hourly_agent_profiles suites. Command: `timeout 45 node --test tests/daily_maintenance/{agent_coverage_latest,quality_agents,hourly_orchestrator,hourly_ledger,hourly_agent_profiles}.test.cjs`.
- Source inventory:125 `.test.cjs` files on exact application source above, excluding only the existing separately-blocked media release test. Before:1unmapped/0duplicates. After:0unmapped/0duplicates; exact timer owners `["timer"]`. New manifest SHA256: `fc36b4c7fb0643a458e6debb6dd28a9ae93a0fcc25582c86a8f6494c21fe9937`.
- Existing exact-head source CI: [39633069742](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39633069742) SUCCESS at0034615. No new workflow, Android build, emulator or expensive scan was started in this review.
- Issue69 snapshot run39689578439 remains COVERAGE_GAP under old manifest9e698497ce31ddea70590a5b4b1c8962003b8ceae8eae61b3e6e3a6fc76cbcc2 despite12 historical specialist records. Those records cannot be reused after this manifest change.
- ANDROID/APK/AAB: NOT_TESTED / not built this session. SECURITY/LOCALES: no source change; not audited here. No package, v21, user data, permission, signing or media changes.
- MERGED_INTO_STAGING:NO. MERGED_INTO_MAIN:NO. RELEASE_APPROVED=NO.
- NEXT EXACT OPERATION: review existing PR173 for default-branch admission. After its normal human-approved merge, let the existing bounded hourly rotation collect four cohorts on one pinned application SHA and the new identical manifest; verify each result is fresh and coverage remains empty before calling FULL_SOURCE_CYCLE_PASS. Do not inherit the old12/12 records or dispatch four heavy runs merely to fill a report.
