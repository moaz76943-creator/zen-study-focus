# CONTINUOUS_AGENT_STATE — Deep Focus

- **Canonical Integration Target (ONLY Official Branch):** `integration/master-qa-verified-v21` (`111a05a2ce144a90d40ed26f0dd59529eccf4c54`)
- **GitHub `main` Branch Sync:** Mirrors `integration/master-qa-verified-v21` (`111a05a2ce144a90d40ed26f0dd59529eccf4c54`)
- **Verified Code & Security Baseline:**
  - Local 500/501 tests (501/501 on Linux CI), 51/51 E2E, 8/8 Track 13 CodeQL adjudication, 3/3 budgets_and_a11y.
  - Group A P1/P2 backup & SAF fixes applied (`vault_backup.js` atomic `coreFortressV21`, `812`/`825` hardening, `8 MiB` unified limit, `pending_backup_export.tmp` lifecycle guard).
- **Remaining Manual Gates:** Play Console keystore rotation (`DF-004` / Gitleaks) + real-device QA on Xiaomi 17T Pro.
- **Rule for All Agents:** Always commit onto `integration/master-qa-verified-v21` (never `force push` or delete branches).
