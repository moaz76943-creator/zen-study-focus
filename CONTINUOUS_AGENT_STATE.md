# CONTINUOUS_AGENT_STATE — Deep Focus

- **Canonical Integration Target (ONLY Official Branch):** `integration/master-qa-verified-v21` (`111a05a2ce144a90d40ed26f0dd59529eccf4c54`)
- **GitHub `main` Branch Sync:** Mirrors `integration/master-qa-verified-v21` (`111a05a2ce144a90d40ed26f0dd59529eccf4c54`)
- **Verified Code & Security Baseline:**
  - Local 500/501 tests (501/501 on Linux CI), 51/51 E2E, 8/8 Track 13 CodeQL adjudication, 3/3 budgets_and_a11y.
  - Group A P1/P2 backup & SAF fixes applied (`vault_backup.js` atomic `coreFortressV21`, `812`/`825` hardening, `8 MiB` unified limit, `pending_backup_export.tmp` lifecycle guard).
- **2026-11-15 soundscape/edge-to-edge fix batch (commit on `integration/master-qa-verified-v21`):**
  - Edge-to-edge insets: WebView black background + `WindowCompat.setDecorFitsSystemWindows(false)` + `setClipToPadding(true)` in `MainActivity.java` (verified: still `systemBars|displayCutout|ime` insets applied as padding).
  - Nature sounds: Fire (procedurally synthesized `campfire_embers.ogg`, ffmpeg brown-noise + crackle, dedicated to CC0) and Water Drip tiles added to `SOUNDS_DATA` — every bundled `.ogg` is now visible, reachable and playable; `.sbg-drip` tile CSS added; all app.js locale catalogs gained `drip` names.
  - Spatial Studio card capped (`#dfPillar5SpatialMount .df-white-premium` max-height 46vh / 440px, touch-action pan-y) so the nature grid is never pushed under the fold.
  - Floating "✨ الاستوديوهات (10)" pill: right-corner docked, high-contrast (#111827 solid + 2px green border), 48px min tap target, z-index 150 (below modal overlay, above nav/FAB), never covers FAB or centered nav tabs.
  - `node tools/run_tests.mjs` → 501/501 pass after changes. Campfire source documented in `audio/LICENSES.json`.
  - CI on HEAD `9f004ab3`: CI tests ✓, Build Production AAB & APK ✓ (run 43673789288, signed upload-key APK `deep-focus-apk-upload-key` → `artifacts/df-apk-latest/app-release.apk`, 10,584,798 bytes, verified zip integrity + contains campfire_embers.ogg, .sbg-drip, spatial cap, right-docked pill, fire/drip tiles), Mobile Visual QA ✓, Track 13 CodeQL ✓, P0 SAF QA ✓. Track 13 Gitleaks history finding (commit 0efc9c80) is pre-existing; current tree scan is ZERO_FINDINGS PASS.
- **Remaining Manual Gates:** Play Console keystore rotation (`DF-004` / Gitleaks) + real-device QA on Xiaomi 17T Pro.
- **Rule for All Agents:** Always commit onto `integration/master-qa-verified-v21` (never `force push` or delete branches).
