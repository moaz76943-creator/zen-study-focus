# Deep Focus v21 — Data Compatibility Contract

**Owner:** DEEP-FOCUS-01-DATA-SAFETY · **Source baseline:** `fix/v21-safe-release-recovery-20261018` at `527d85978c8dfd3a3eab8aa8cfae199c4d541c8b` (2026-10-19). **Status:** standalone module, not wired into application startup; lane 00 owns integration.

## Live v21 evidence

Inspected `android/app/src/main/assets/web/app.js`, `notes_studio.js` and `notes_drafts.js` at the baseline SHA; existing `tests/smoke_app.cjs` confirms restore and primary/mirror fallback.

| Item | Actual legacy schema and required compatibility |
| --- | --- |
| `cfg` | Plain JSON object with `lang`, `domain`, `focusMin`, `shortMin`, `longMin`, `todayMins`, `sessions`, `streak`, `water`, `sets`, `pagesRead`; newer properties include `metricsDate`, `sessionHistory`, per-domain goals and cycles. Preserve every unknown property. |
| `cfg.sessionHistory` | Optional array of `{id, date, minutes, domain, ...}`. Timer session `id` is an **opaque value (commonly a string)**, not a task or note ID; do not coerce or recalculate durations. Duplicate session IDs are reported, not removed. |
| `tasksList` | Array of `{id: number, isStarter: boolean, title: string, time?, date?, catKey?, icon?, theme?, done: boolean, ...}`. Initial starter IDs 1–4. Live records use numeric `nextRecordId()` IDs. |
| `notesList` | Array of `{id: number, isStarter?, title: string, body: string, catKey?, calDate?, blur?, theme?, pinned?, favorite?, createdAt?, updatedAt?, ...}`. Initial starter IDs 1–3. Notes Studio currently preserves IDs when editing and uses numeric IDs for duplication. |
| Storage | `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21` and **each** `_mirror`. Each contains JSON `{payload: JSON.stringify(data), sig: computeHash(payload), ts}`. Reader prefers verified primary and falls back to verified mirror. Never silently reset corrupt slots. |
| Backup | `ZEN21::` + Base64-encoded UTF-8 JSON `{bundle: JSON.stringify({cfg,tasksList,notesList,v:21}), sig: computeHash(bundle)}`; also accept legacy Base64 **without prefix**. Existing importer requires `v === 21`. Hash is a non-cryptographic, keyed FNV-like integrity check: **not encryption, not authenticity/security protection**. No automatic cloud synchronization. |
| Additional note draft | `deep_focus_unsaved_note_draft_v1` is a **separate optional draft key** and not in v21 bundle; this module does not touch or claim to export it. |
| Active timer | `zen_fortress_active_timer_v21` is separate from the three record families and not backed up through v21 bundle; do not overwrite it in a migration. |

**IDs:** preserve safe, nonnegative **numeric** task/note IDs and their JavaScript `number` type. Never introduce string IDs such as `note_*`, `task_*` or coerce numeric strings. `tasksList` and `notesList` are separate namespaces: their old starter IDs intentionally overlap across collections, so cross-collection collisions are not grounds for deletion. Duplicate IDs *within* a collection get `DUPLICATE_ID` warnings, without repair; duplicate session IDs get `DUPLICATE_SESSION` warnings.

## Module: `data_compat_v21.js`

Browser API: `window.DeepFocusDataCompatV21` only **after lane 00 explicitly includes the script**. In Node: `require('.../data_compat_v21.js')`. Import has **no side effects**. It does not load from or write to `localStorage` until passed an explicit storage instance.

- `inspectRecords({cfg,tasksList,notesList})`: pure schema and duplicate inspection; `issues` have `severity`, `code`, `path`, `detail`. Unknown fields preserved.
- `inspectStorage(localStorage)`: read-only verification of three primary/mirror pairs with chosen sources; warns `INVALID_PRIMARY`, `INVALID_MIRROR`, or `MIRROR_DIVERGED`. Failure if neither is safe; never overwrites either copy or installs defaults on read.
- `inspectBackup(code)`: read-only parser for exact v21 wrapped/plain Base64; validates checksum before JSON/schemas. Rejects malformed inputs, fabricated/string IDs and unsupported `v:20` because that older shape was not verified in this baseline. **Do not promise acceptance of unverified pre-v21 formats.**
- `planMigration(snapshot, {cfg,task,note,session})`: pure **additive** preview; adds absent properties only. Historical fields/IDs and existing values untouched. Does not merge/erase duplicate records. `planMigrationFromStorage(localStorage, additions)` binds preview to exact original raw packet strings.
- `planRestoreFromBackup(localStorage, code)`: explicit preview for replacing the three v21 families **only**. It rejects malformed backup or unsafe current storage; old snapshot remains until commit.
- `commitPlan(localStorage, plan, {approved:true})`: explicit opt-in only, verifies source has not changed, blocks mutation of existing fields for additive plans, validates output, writes a durable journal before rewriting the six packets, verifies every write, then marks committed. On write errors it restores **original packet bytes**, not just parsed objects. Cannot be used with unbound pure preview. A successful commit does not modify unrelated storage keys.
- `inspectPending(localStorage)` and `recoverPending(localStorage,{approved:true})`: **explicit** crash recovery. Pending journal rolls back to original bytes, committed journal with complete new data only gets cleaned up. Unknown concurrent mutations or corrupt journal block recovery without guessing.

## Execution and rollback limits

1. **Preflight and user consent:** obtain an actual user decision in UI first, retain a user-controlled/exported backup, call `inspectPending`; present reports and the migration diff. `{approved:true}` is a capability flag, **not** a user confirmation UI.
2. **Quiesce all writers:** timer/notes/task autosave and backup operations must be paused during commit/recovery, across WebViews/tabs if applicable. v21's existing `saveFortressData` is *not* journal-aware and may rewrite partially migrated state. Before normal app initialization or writes, lane 00 must inspect unresolved journal and block normal UI until explicit recovery; a journal is not self-recovering.
3. **Storage capacity:** write-ahead journaling duplicates current data and planned packets temporarily, so low WebView storage quota may block safe writes; this is a safe failure, not permission to skip journaling. Test near-quota conditions on a real device.
4. **Failure recovery:** on normal write failures rollback occurs automatically; if rollback cannot finish, **retain the journal** and require explicit later recovery. If journal cleanup fails after a committed migration, return `cleanupPending:true`; user data is committed, but next writer must be blocked until cleanup. No guarantee against malicious storage modification, hardware failure or browser engines that violate localStorage durability.
5. **Backup import:** a checksum does not provide confidentiality or authentication. A backup is readable plaintext once Base64-decoded. Untrusted backups must be explicitly reviewed, size-limited and validated; never auto-import.
6. **No automatic read-time mutation:** inspections/plans only read and allocate in-memory objects. Data updates happen only through an explicit, approved commit/recovery invocation.
7. **Do not put this module into `index.html` in this lane.** It is intentionally not active without integration.

## Handoff to DEEP-FOCUS-00-INTEGRATION

- Consume this branch as a single, scoped commit; verify only these files changed: `android/app/src/main/assets/web/data_compat_v21.js`, `docs/contracts/DATA_COMPAT_V21.md`, `tests/data_contracts/data_compat_v21.test.cjs`.
- Script placement, `app.js` initialization sequencing, consent modal, shared CI workflow and `tests/smoke_app.cjs` belong to lane 00. Do **not** replace existing backup/restore logic or `nextRecordId()` blindly.
- If integrating, guard unresolved journal **before any existing app initialization writes** and ensure writes are quiescent for the transaction. Do not enable automatic migration/repair. Verify non-starter task history, note editing, focus credit, backup restore, upgrade from installed v21 and WebView `localStorage` on an actual phone.
- Add `node --check android/app/src/main/assets/web/data_compat_v21.js` and `node --test tests/data_contracts/*.test.cjs` to shared CI only in lane 00, followed by existing `node tests/smoke_app.cjs`, Python regressions and Android debug build.
- **No change to package name** `com.zenstudy.focus`, storage v21 names, `ZEN21::`, signing, build workflow or original timer engine.

## Evidence and regression command

Before implementation, running the new test suite failed due to missing module (`MODULE_NOT_FOUND` — RED). After implementation, run:

```sh
node --check android/app/src/main/assets/web/data_compat_v21.js
node --test tests/data_contracts/data_compat_v21.test.cjs
```

Tests cover prior v21 sample fixtures, Unicode, flags and unknown fields, numeric-ID rejection, mirror corruption/divergence, duplicates, prefixed/unprefixed backups, invalid hash and schema, explicit consent, optimistic concurrency, complete and failed transactions, interrupted writes, durable recovery and failed import rollback. **No physical-device APK test is claimed for this isolated lane.**
