# DEEP-FOCUS-03 — Notes UX integration contract

Base: fix/v21-safe-release-recovery-20261018 at 527d85978c8dfd3a3eab8aa8cfae199c4d541c8b.
Depends on lane 01 data_compat_v21.js, lane 02 notes_core_v21.js and optional lane 07 design_tokens_v22.css / ui_components_v22.css.
Owns only notes_studio.js, notes_drafts.js, notes_editor_ui.js, tests/notes_ui/.
No index.html, white_2100.css, Android, app.js or legacy storage keys changed.

## Features

- Responsive white premium interface, cyan/blue/violet accents, tags/notebook selectors, archive/trash filters and list pagination.
- Selection-preserving Markdown-text toolbar (headings, numbered/bulleted/checkbox lists, quote), safe text-node preview and find-within-note.
- True structured Cornell cues/main-notes/summary without guessing that legacy body has a structure; active recall shows only user-authored question/answer pairs.
- Reader mode, distraction-free writing, RTL/LTR mixed paragraphs, small-display keyboard viewport adjustments, 44px touch surfaces.
- Core-backed numeric v21 note IDs and unknown property preservation, opt-in revision Undo/Redo, archive/trash/restore, guarded irreversible delete.
- Verified single unsaved draft in existing deep_focus_unsaved_note_draft_v1 slot. Existing v1 format remains valid. Foreign-note drafts cannot be silently replaced. This slot is not included in ZEN21:: backup.

## Loading and mounting: lane 00 ONLY

Use this script order after app.js: notes_core_v21.js BEFORE notes_studio.js; notes_editor_ui.js AFTER notes_studio.js; notes_drafts.js AFTER notes_editor_ui.js. Respect lane 01 preflight/journal guard BEFORE the app's normal writers start.

Install only after load and before any interaction: DeepFocusNotesEditorUI.install(adapter).
The adapter must supply:

| API | Requirement |
| --- | --- |
| readState() | Return current {notesList,tasksList}; no mutation. |
| nextNumericId() | Use current approved allocator; strict numeric safe integer, never string IDs. |
| now() | Current safe integer Unix milliseconds. |
| locale() | Return UI language, e.g. ar or en. |
| notify(text) | Visible error/status toast. |
| commitNotes(before,after) | Synchronously check snapshot concurrency, durably update/verify notes primary+mirror using authorized journal/rollback protocol, THEN publish to memory; throw on failure and return exactly true only on success. |
| onSaved(after) | Optional re-render of calendar and other note consumers after real commit. |
| confirmPermanentDelete(id) | Explicit user confirmation + exported backup acknowledgement as {confirmed:true,backupAcknowledged:true}. |
| commitBoth(before,after) | Optional; required for task extraction. Atomic durable two-family notesList/tasksList save with primary/mirror verification and rollback of original packet bytes on ANY failure. |
| confirmTaskExtraction(noteId,note) | Optional verified user preview/confirmation; do not run without commitBoth. |
| pickNoteLinkTarget(sourceId,notes) | Optional numeric-ID note picker; core validates link. |
| openCalendarForNote(id) | Optional date navigation, no invented calendar IDs. |

IMPORTANT: The current saveFortressData silently catches quota failures; it is NOT a valid durable commit acknowledgement. Also lane 01 commitPlan handles additive migration and explicit restore, not arbitrary note edits. Lane 00 must implement/verify a safe journal-aware edit transaction or keep the optional Notes UX disabled. The UI will not report a successful save on false/missing acknowledgement.

Lane 00 must own changes to the pre-existing app.js paths: calendar/quick-dump creation, deleteNoteCard, backup restore, language switching and ordinary note refresh. Check all writers share the safe commit protocol. If other UI still bypasses the journal, block integration until safe. No automatic data migration/repair or hard delete at startup.

## Verification after repository checkout

Run from repo root:

    node --check android/app/src/main/assets/web/notes_studio.js
    node --check android/app/src/main/assets/web/notes_drafts.js
    node --check android/app/src/main/assets/web/notes_editor_ui.js
    node --test tests/notes_ui/*.test.cjs

Lane 03 evidence: 13 of 13 tests from committed editor test file executed with isolated V8 adapter; 4 additional adapter checks passed against the exact lane 02 Core source, and 3 simulated local WebView draft checks passed. Real Node suite, actual Android WebView, low-storage quota, process death, keyboard, complete backup/restore and APK build have not been run in this lane. Neither a green CI result nor production readiness is asserted.

For acceptance, lane 00 must additionally run existing smoke_app.cjs, Python guards, Android build, restoration and on-device tests; add these new tests to CI; load lane 07 white design tokens only through the coordinated CSS merge; confirm application data, notes, tasks, timer and ZEN21:: backups remain consistent.
