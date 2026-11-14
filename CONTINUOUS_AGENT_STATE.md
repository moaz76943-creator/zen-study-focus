# CONTINUOUS_AGENT_STATE — Deep Focus Sovereign Status

- **Current Version:** `v666.0.0` (`VERSION_CODE=41386`)
- **Canonical Integration Target:** `main`
- **Retained Integration Source:** `integration/master-qa-verified-v21` (preserved; no deletion or force-push)
- **Current Consolidation:** PR #616 — 100-language catalog policy and verified v21 i18n/CI changes.
- **Language Policy:** Official catalog contains exactly 100 unique language codes. Hebrew and legacy aliases `he` / `iw` are excluded. The remaining forbidden codes are `syc, ber, zgh, kab, yi, ji, tmh, tzm, shi`.
- **Translation Availability:** Catalog membership is not equivalent to a shipped translation. `i18n/COVERAGE.md` is authoritative for pack presence, translation coverage, and human-review status. Missing or unreviewed packs must not be represented as production-ready.
- **Runtime Dictionaries:** The current GlobalI18nEngine has 16 active dictionaries. This is an implementation/rollout state, not a cap on the official 100-language product catalog.
- **Numeral Policy:** Normalize Unicode decimal digits to Western `0123456789` wherever app-generated numbers are displayed.
- **Storage Architecture:** Preserve v21 durable storage, atomic journal-staged writes, primary/mirror recovery, and all protected keys. No destructive reset or storage-schema downgrade.
- **Repository Safety:** No force-push, no branch/tag deletion, no secrets in source, and no merge of stale/conflicting PRs without reviewing their current diff and exact-head checks.
- **Termux Agent Inventory (2026-11-14):** Screenshot evidence confirms an `ollama serve` process is running. Installed Ollama model IDs, other local model runners, and agent CLIs have not yet been inventoried; do not infer installation from the server process alone.
- **Known CI Baseline:** The current `main` head has a failing `node-tests` run at `tests/release_invariants.test.cjs`. PR #616 corrects the stale completion-tone invariant and reruns the full regression gate before merge.
