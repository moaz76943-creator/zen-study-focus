# Track 16 — agent ownership, activation and source evidence audit (2026-10-21)

## Source-of-truth and guardrails
- Repository default main `13c97a790b1206cd2573c38ff8bc243ef192a444` at audit. Active canonical draft PR #138 head `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5` at audit. Re-query heads on every run; neither SHA is permanent.
- Issue #69 shows 12/12 **SOURCE_TESTED only** on old integration `93aa1be5dd3fcc08027b5ffe9fd03d6b5e250b09`. Successful Actions run 39588235307 checked out old source. It cannot be applied to #138.
- Source references are now resolved against live PR #138 before checkout and revalidated before report publication. A moved/closed PR, missing report, or mismatched source SHA is NOT_VERIFIED and fails the job. Historical recovery or main manual runs must be explicitly identified as such.
- Scheduled hourly jobs run a bounded 3-agent cohort, 18-minute timeout. All 12 rotate over 4 hours when the source SHA remains unchanged. Twice-daily scans (02:17,14:17 UTC) run the comprehensive source gates with 35-minute bound. Friday debug APK remains test-only. GitHub cron can be delayed or skipped.
- Scheduled daily runs default to `audit` rather than a source-mutating `safe-fix`. Manual CSS regeneration alone may propose a separate draft PR and requires explicit review. No app source edits, auto-merge, release signing, or media activation.
- Running the source suites does **not** prove native Android interaction, screen-off audio, SAF, acoustic authenticity, professional translation, or approval. RELEASE_APPROVED=NO.

## Agent manifest and exclusive source-test ownership

| Agent | Lane | Only owned directories | Source permissions |
|---|---|---|---|
| localization | locale | localization_20; language_review | read + bounded tests |
| numerals | numerals | ascii_numerals | read + bounded tests |
| navigation | ui | interaction_recovery; android_e2e_recovery | read + bounded tests, not Android E2E |
| notes | notes | notes_core; notes_recovery; notes_ui | read + bounded tests |
| tasks | tasks | tasks_core; tasks_recovery | read + bounded tests |
| analytics | analytics | analytics_core; analytics_recovery | read + bounded tests |
| timer | timer | focus_workflows; timer_native_bridge | read + bounded tests |
| nature_audio | audio | nature_audio_recovery; completion_alerts; audio_acquisition_12 | read + bounded tests, no assets activated |
| privacy_security | security | security_recovery; recovery_baseline | read + bounded tests, no secrets |
| data_integrity | data | data_contracts; regression_v21; integration_quality | read + bounded tests, no user data |
| performance | performance | performance_recovery | read + bounded tests |
| product_consistency | qa | design_quality; white_premium_qa; master_completion; control_center; quality_center; integration_recovery; master_recovery_qa; ux_recovery15 | read + bounded tests |

Directories above are relative to `tests/`. Canonical machine-readable mapping is `tools/daily_maintenance/agents.json`. No agent is allowed to mutate application code, user content, permissions, release state, secrets or another lane. `quality_agents.cjs` now rejects overlapping directory ownership. New `.test.cjs` suites are inventoried and must have exactly one reviewed owner. The intentionally failing media-provenance release gate is evaluated separately, never counted as a PASS.

## Conflict and PR status (as checked, never auto-resolve)
- #53 closed unmerged and superseded by merged #54; #55 closed unmerged: do not cherry-pick.
- #60 and #62 merged hourly rotation and six-hour source evidence ledger; #63 merged AGENTS.md. Do not recreate them.
- #64 is not found as a pull request. #65 remains draft/open on main and proposes limited **docs-only** auto-merge: its permissions/ownership policy must be independently reviewed; Track 16 does not enable it.
- #138 is the current draft application integration target. It is not equivalent to a released or Android-tested source. #143/#145 are separate staged verification branches and must not overwrite #138 or each other.
- Exact-head checks, contract unit tests and artifact review precede any human-reviewed merge. New features must keep existing UI/Android/v21 preservation tests. Failure of a test cannot be fixed by deletion of functionality.

## Evidence, incidents and resumability
- SHA-bound source reports plus agent-manifest fingerprint are stored in Actions artifacts; single Issue #69 cumulative ledger expires after 6h or immediately on SHA/manifest change.
- Each run carries GitHub Run ID, reported source SHA, selected specialists and scoped PASS/FAIL/NOT_TESTED; inspect these fields before re-run. No test tokens are exposed to source checkout.
- Missing source checkout, malformed evidence, ownership overlap, timeout, or changed PR #138 SHA blocks green. A follow-up workflow_dispatch safely retries the desired ref; do not write a new issue per attempt.
- Source quality is measured by actual executed TAP cases, failure rates, unmapped tests and time-to-recovery, not number of reports.
- Automated generation of arbitrary new behavior tests is intentionally NOT enabled: new feature contracts require reviewed regression tests and ownership. Proposed code fixes require separate draft RED/GREEN PRs.

## Verification protocol for this Track 16 draft PR
1. Local RED: missing `canonical_source.cjs` caused regression suite to fail.
2. Local GREEN: 5/5 canonical-source unit cases passed under Node, prior to repository upload.
3. GitHub Actions on exact final PR SHA: check hourly contract tests and daily-maintenance test jobs; report actual status and run IDs, never infer.
4. Schedule activation requires manual merge onto default branch; until then Issue #69 continues to represent historical source, not #138.
