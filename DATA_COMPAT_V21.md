# DATA_COMPAT_V21 — Storage & Migration Contract (`v664.0.0`)

1. **Durable Keys (`DURABLE_V21_KEYS`):**
   - `zen_fortress_cfg_v21` & `zen_fortress_cfg_v21_mirror`
   - `zen_fortress_tasks_v21` & `zen_fortress_tasks_v21_mirror`
   - `zen_fortress_notes_v21` & `zen_fortress_notes_v21_mirror`
2. **Journal-Safe Atomic Write (`dfAtomicWriteV21`):**
   - Every write validates JSON syntax before writing to `<key>_journal_tmp`, commits to primary `<key>`, syncs `<key>_mirror`, and removes `<key>_journal_tmp`.
   - Concurrent writes are blocked while `migrationLock` is active during `dfReconcileMirrorsOnBoot()`.
3. **Backup Formats:**
   - `ZEN21::` portable Base64 snapshot (explicitly labeled unencrypted for local portability).
   - `AES-GCM 256-bit` (`PBKDF2` 100,000 iterations) encrypted vault in `vault_backup.js` for confidential backups.
