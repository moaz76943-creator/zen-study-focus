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
