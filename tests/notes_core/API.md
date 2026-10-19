# DEEP-FOCUS-02 — Notes Core v21 API / lane 03 handoff

Pure UMD module: `android/app/src/main/assets/web/notes_core_v21.js`. Node: `require('../../android/app/src/main/assets/web/notes_core_v21.js')` from `tests/notes_core/`; browser: `window.DeepFocusNotesCoreV21` **only after lane 00 includes the script**. Import has no read/write effects and no DOM/localStorage dependency. It does **not** change `notes_studio.js`, `app.js`, backup, Android code or shared workflows.

## Data contract

- Input is the existing `notesList` array. IDs for **notes and tasks are nonnegative safe integer JavaScript numbers**; IDs from `nextRecordId()` should be passed by the caller. Numeric strings are not accepted and IDs are never renumbered. Unknown JSON fields remain intact; operations that target an ambiguous duplicated note ID throw `DUPLICATE_ID` instead of repairing it.
- Legacy fields `title`, `body`, `catKey`, `calDate`, `blur`, `theme`, `pinned`, `favorite`, `createdAt`, `updatedAt`, `isStarter` are preserved unless explicitly patched (except protected IDs, `isStarter`, `createdAt`). All additional structured fields reside in an optional `notesV21` object: `kind`, `cornell: {cues,notes,summary}`, `notebookId` (an opaque notebook label, not a note ID), `tags`, `links: number[]`, `archivedAt`, `deletedAt`, `revisions`, `redo`, `extractedKeys`, and `recallPairs`. Unknown fields inside `notesV21` also survive edits. Do not rewrite old Cornell `body` by guessing a structure.
- Every mutator accepts and returns **in-memory data** only; it never persists. Caller controls user consent, allocation of numeric IDs, timestamps (Unix milliseconds, safe nonnegative integer), and storage through the lane 01-approved compatibility/persistence path. Do not call `localStorage.setItem` from the core or introduce new storage keys. A returned copy does not imply save success.
- `notesV21.extractedKeys` is a **monotonic safety ledger** for task extraction and cannot be patched directly. Undo/redo preserves it. Checklist key for existing free-text checkbox is derived from section + exact trimmed text + ordinal among identical checkbox labels. Editing that text changes its key; a genuinely renamed checkbox may be extracted as a new task. For stricter edit-stable identity, lane 03 should assign persistent checkbox IDs in a future controlled schema rather than pretend free-text lines have immutable identity.

## API reference

| Method | Contract / output |
| --- | --- |
| `createNote(notes, note, {now})` | New array; note requires caller-supplied numeric `id`, string `title` and `body`. Throws on duplicates. |
| `edit(notes,id,patch,{now,extension?})` | Immutable edit; optional `extension` changes `notesV21` fields; records at most 10 undo snapshots and clears redo. Never updates protected legacy fields. |
| `undo(notes,id,now)` / `redo(notes,id,now)` | Immutable revision navigation; no-op when no history. Task-extraction ledger retained. |
| `validateCornell(c)` / `cornellText(note)` | Dedicated cues / notes / summary; `cornellText` renders without changing original `body`. |
| `createTemplate(definition)` / `fromTemplate(notes,template,id,{now,title?,fields?})` | Define custom local template and apply by allocating a *numeric* note ID. `BUILTIN_TEMPLATES` offers five starter definitions. Template storage and UI are lane 03's responsibility. |
| `setStatus(notes,id,'archive'\|'trash'\|'restore',now)` | Archive/trash timestamps, restore clears both; preserves record and history. |
| `permanentlyDelete(notes,id,{approved:true})` | Explicit in-memory removal **only from trash**; caller must request real user consent, confirm backup and persist via approved gate. |
| `link(notes,sourceId,targetId,now)` / `backlinks(notes,id)` | Unidirectional link to an existing numeric target; backlinks derived, not redundantly stored. |
| `normalizeSearch(text)` | Arabic diacritics/tatweel removal, Arabic hamza/alif folding and Unicode NFKC **for search only**. |
| `search(notes,{query?,sort?,status?,tags?,notebookId?,kind?,favoriteOnly?,pinnedOnly?,offset?,limit?})` | `{items,total,offset,limit}`; default active notes, pinned first; sort `recent`/`oldest`/`title`; status `active`/`archived`/`trash`/`all`; limit at most 100. Search reads at most 10,000 records with no retained global index. |
| `checklistItems(note)` / `checklistCandidates(notes,tasks,noteId)` | Parsed checkbox items and not-yet-extracted candidates `{key,title,section}`; accepts `☐`, `- [ ]`, `* [ ]`, `[ ]`; scans body and optional Cornell main notes. |
| `extractTasks(notes,tasks,noteId,[{key,taskId}],now)` | Atomic pure output `{notes,tasks,created}`; validates all assigned **numeric** task IDs and duplicate keys before returning. UI must call candidate preview then explicitly assign fresh task IDs via `nextRecordId()`. No duplicate extraction while original ledger or task origin exists. |
| `recallCards(note)` | Uses only explicitly authored `notesV21.recallPairs` with nonempty question/answer; returns `{noteId,key,question,answer}[]` and does not invent knowledge or review scheduling. Stable `key` should be authored by lane 03. |

## Integration sequence (lane 03 / lane 00)

1. Lane 00 includes the standalone file **after** its approved data-compat contract checks. Lane 03 may call the methods from the existing Notes Studio UI, but must not load the module itself into the shared app without lane 00's coordinated startup change.
2. Obtain the current validated `notesList` (and `tasksList` for extraction); use explicit numeric note/task IDs and `Date.now()` supplied from the UI edge. Never guess an ID or use `Number(id)` on untrusted strings.
3. Preview candidates, changes and irreversible actions; get user confirmation for removal. Apply a pure operation and ask the owning persistence layer to commit *the entire* returned snapshot transactionally. Never assign the new in-memory lists as authoritative until storage confirms success.
4. Add `node --check android/app/src/main/assets/web/notes_core_v21.js` and `node --test tests/notes_core/*.test.cjs` to shared CI **only in lane 00**. Keep the existing smoke tests, locale tests and Android device upgrade verification.

## Verification & limits

Local Node 22 tests cover legacy ID/field retention, duplicates, Cornell/templates, 10 bounded revisions, recovery, tags/notebooks, Arabic search, archive/trash, links, repeat task extraction, recall and a 10,000-record performance sample. This is not device/WebView verification; user-data upgrade, quota handling, real UI flow and Android runtime must be validated by integration owner. The module does **not** back up records itself, does **not** encrypt stored note content, and does **not** claim full offline FTS indexing.
