# Known limitations and ownership contracts

Honest status of areas flagged by audits. Nothing here is claimed as device-tested.

## Data ownership and integrity
- Authoritative user data: the six `zen_fortress_{cfg,tasks,notes}_v21` keys and their `_mirror` copies, written only through `saveFortressData` / read through `loadFortressData` (see STORAGE_KEYS.md).
- The packet hash is a tamper/corruption *detector* (FNV-style + salt), not cryptographic protection; the salt ships in the app. Treat it as integrity-against-accident only.
- Unreadable packets are copied to `df_quarantine_<key>_<0-2>` (3 slots, oldest overwritten), never deleted silently.
- `modules/security/tamper_proof_integrity_guard.js` is fail-closed and quarantines before re-baselining.

## Timers
- The authoritative timer is in `app.js` and uses an absolute deadline. `high_precision_timer_engine.js` and `session_crash_recovery_engine.js` are inactive helpers (never started); they must not become a second accounting system.
- Completion alarms use `setAndAllowWhileIdle` (inexact by design, to avoid the exact-alarm permission). They can fire late under Doze. Not device-tested.

## Backups
- `vault_backup.js` encrypts only flashcards, notes, reader docs, syllabus and cognitive history (AES-GCM, PBKDF2 100k, passphrase >= 10 chars, 4 MB cap). It does NOT include the six v21 packets.
- `sovereign_backup_hardening_825.js` restore accepts only `zen_fortress_*_v21(_mirror)` and `df_*` keys, verifies each write and rolls back on failure. It is not wired to UI.
- Rollback is best-effort: a storage failure during rollback itself cannot be recovered.

## Performance module
- `web_worker_120hz_engine.js` is synchronous helpers/metrics. No Worker is started (CSP), nothing is encrypted, refresh rate is only reported when the platform exposes it.

## Widget
- No `AppWidgetProvider` ships. `widget_sync.js` / `sovereign_widget_bridge.js` report `delivered:false`; the preview is UI only.

## Localization
- Some modules (e.g. timer settings) carry only English/Arabic strings. Other locales fall back to English; no translations are invented. Hard-coded Arabic strings remain in a few legacy modules.

## Security posture
- CSP still allows `unsafe-inline` because of ~120 inline `onclick` handlers (ratchet in `tests/ratchets.json` may only decrease). Removing it needs device testing.
- Remaining `innerHTML` sinks are ratcheted; user-controlled values go through `esc()` or `dfSanitizeHtmlFragment`.

## Tests
- 18 legacy tests are listed in `tests/KNOWN_FAILING.txt`; the runner fails on any new failure outside that list. Many older tests are source-shape checks; behavioural coverage lives in `tests/*batch*`, `report2_regressions` and `tools/browser_checks`.
- CI evidence (Gitleaks, CodeQL) must be read from run logs; real-device QA is still required before release.
