# DEEP-FOCUS-RECOVERY-07 — notes handoff

Source: Issue #13, **DF-085–DF-104**. Baseline: `632ef51ae6034224e6b459e0962a8bbedbf2b18e` on `fix/v21-safe-release-recovery-20261018`.

## Scope and ownership

Only modify the existing Notes-owned `notes_editor_ui.js` / `notes_drafts.js`, add `tests/notes_recovery/`, a one-file Node-test discovery bridge under `tests/notes_ui/`, and this document. Do **not** edit `app.js`, `index.html`, `white_2100.css`, `integration_v22.js`, Notes Core, v21 keys, Android native, or CI. No auto-merge or user-data migration.

Existing Notes Core and Notes UX, not reimplemented here, already supply numeric CRUD, Cornell, authored recall, notebook/tag search, archive, trash, restore, revisions, note links and task extraction with the approved atomic `commitBoth` adapter. Only the integration layer can assert durable commits.

## Delivered in this scoped patch (pending integrated CI/device QA)

- **DF-085/104:** Compact notes cards with Edit/Read visible, other commands grouped under accessible `<details>` More actions. Advanced editor fields hidden behind disclosure for quick notes; Cornell/recall reveal their dedicated fields.
- **DF-087:** Existing formatting, heading, ordered/bullet/checkbox, quote, preview and card-level note revision Undo/Redo preserved; localized checkbox action.
- **DF-089/090:** Opening an existing note captures its exact JSON snapshot. Saving refuses a changed note with `NOTE_CONFLICT_RELOAD_REQUIRED` before any durable commit. New drafts carry their opening snapshot; stale draft restore and stale-draft autosave replacement are refused. Old v1 drafts (without fingerprint) remain readable. If autosave fails when closing a modified editor, user must explicitly confirm the risk or the editor remains open.
- **DF-092:** Category filter now runs *before* Core search pagination and produces a truthful page count, including 5,000-note fixtures.
- **DF-094:** Saved checklist counts include unfinished/finished checkbox lines, exclude ordinary text, and never fabricate task completion. The existing editor toggles checkbox text; reader checkboxes remain read-only.
- **DF-095/096:** Reader adds a heading navigation list when the note has multiple headings, existing numeric-id outgoing links, backlinks and a visible unavailable-target label for missing/trashed links.
- **DF-100/102:** Existing inert text-node preview remains in force; TXT and HTML-escaped Markdown can be **copied** with a verified clipboard promise. Do not label copied content as an Android SAF file export or PDF.

## Deferred or dependent items

- **DF-090:** Existing `deep_focus_unsaved_note_draft_v1` is a *single saved draft slot*, not one simultaneous draft per note. It is kept for backward compatibility and fail-closed behavior; multiple draft slots require a coordinated storage/backup contract.
- **DF-094:** Reader checkboxes are not tappable (editor toggle + Save works).
- **DF-097:** Full note → calendar-event → task → focus navigation requires integration-owned adapters. Current calendar action navigates only; no fabricated event/task relationship is asserted.
- **DF-102:** Native TXT/Markdown **files**, PDF/print and SAF confirmation must be implemented/tested by the Android integration lane. This patch offers acknowledged clipboard copy only.
- **DF-103:** Actual Android WebView on 320px, full IME/font scaling, forced localStorage quota, interrupted journal recovery, and 5,000-note *rendering* still require device evidence. Only Node-scale Core search has a test.
- All languages besides the present en/ar Notes UI strings remain the independent 20-language localization track's ownership. All generated numerals should be Western 0-9 and handled by the global numeral track.

## Regression commands

From repo root:

```sh
node --check android/app/src/main/assets/web/notes_editor_ui.js
node --check android/app/src/main/assets/web/notes_drafts.js
node --test tests/notes_recovery/*.test.cjs tests/notes_ui/*.test.cjs tests/notes_core/*.test.cjs
node --test tests/integration_quality/*.test.cjs tests/data_contracts/*.test.cjs
node tests/smoke_app.cjs
```

The `tests/notes_ui/recovery_gate.test.cjs` imports recovery tests so the pre-existing v22 GitHub Actions test command will execute them without modifying shared CI configuration. Execution results and exact integrated HEAD must be read from GitHub Actions before marking PASS.

## No data mutation on failed validation

Conflict: reject before `commitNotes`. A refused draft restore does not alter inputs. Copy/export is data read only. Archive/trash/restore and task extraction remain exclusively in approved v21 Notes Core / integration adapter. IDs and unknown fields are not renamed, normalized, deleted or migrated. `ZEN21::` excludes the old draft slot and also excludes any hypothetical multi-draft store.

Human review and Android WebView tests are required before merge or release.
