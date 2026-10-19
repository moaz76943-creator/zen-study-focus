# Security and data-integrity risk register

Baseline: PR #25 head `0dd9239bc28978e11f41c1c0f618c9662b291fe2` (2026-10-19).
Categories below are risk-based review priorities, **not verified exploits**.
The tests use only synthetic in-memory records and checked-in source files.

| ID | Priority | Evidence in inspected source | Potential consequence | Acceptance |
|---|---|---|---|---|
| R-16-01 | P0 | `MainActivity.java`: global `addJavascriptInterface(..., "ZenNative")`, `setAllowFileAccess(true)`; index has no CSP and remote font origins | Any future renderer injection or embedded hostile frame could expose privileged Android bridge; not demonstrated on a device | Restrict to trusted first-party origin, disable general file access and untrusted network subresources, prove on WebView |
| R-16-02 | P1 | `app.js` `createNewTask` and `saveNewNote` mutate live arrays before `saveFortressData` verification | Full storage / write error leaves misleading unsaved in-memory state and may cause accidental persistence later | Commit immutable snapshot then publish only after verified success; fail-state test |
| R-16-03 | P1 | `MainActivity.java` URL override dispatches `http` and `https` externally; Manifest has INTERNET; index loads Google Fonts | HTTP navigation/privacy and network surface; remote fonts are a dependency even in an otherwise offline-first app | HTTPS-only external Intent with validation; local assets/fonts or explicit review of any network calls |
| R-16-04 | P1 | `app.js` importer coerces record IDs via string numeric regex; `data_compat_v21.js` marks duplicate record IDs only as warning | Ambiguous or type-incompatible imported tasks/notes; operations targeting wrong record or refusal to edit | Reject duplicate/string/unsafe IDs on **new import**; retain historical records unchanged and present recovery path |
| R-16-05 | P1 | Backup uses base64 `ZEN21::` with unsalted keyed-looking FNV checksum, Java native Share labels payload unencrypted | Backup recipients/services can read notes/tasks; checksum is not encryption/authentication | Label as plaintext, user confirmation; optional separately designed encrypted export without breaking v21 compatibility |
| R-16-06 | P2 | `notes_drafts.js` auto-save uses `saveFortressData` best-effort, bounded draft, and warns before abandoning failed draft | Quota/process-death may lose unsaved edits if there is no durable draft | Exercise unload/visibility changes, conflict, old note revision, quota, rotation on disposable device |
| R-16-07 | P2 | `app.js` backup restore contains try/rollback of six keys; `data_compat_v21.js` provides explicit journal recovery | Crash during legacy restore loop could leave partially installed snapshot without a durable rollback journal | Centralize restore through journaled v21 transaction; test crash after each key |
| R-16-08 | P2 | `notes_editor_ui.js` uses `createTextNode` for preview and escapes raw markup in Markdown export | Currently lowers raw HTML XSS surface; future Markdown linkification or HTML preview may regress | Preserve text-only preview, disallow javascript/data/vbscript link protocols on any future link component |
| R-16-09 | P2 | `AndroidManifest.xml` specifies `allowBackup=false`, `fullBackupContent=false`; SAF/manual export only | User may have no off-device copy after app deletion/device failure | Clear privacy-preserving manual backup guidance and verified restore drill, no silent backup policy change |

## Existing protective controls (do not remove)

- WebView debugging disabled, mixed content never allowed, universal/file URL access
  from file URLs disabled, WebView content access disabled.
- v21 primary + mirror integrity packets; read-only preflight blocks both damaged
  copies and a pending journal.
- Multi-key `DF22Integration` commit verifies writes and uses explicit
  rollback journal. Existing tests exercise those paths.
- Notes preview uses text nodes rather than evaluating Markdown HTML; Notes UX
  controller provides optimistic concurrency checks.
- Android backup is disabled by policy and the native manual export warns that
  the payload is not encrypted.

## Risk interpretation

- **P0:** block release until reviewed/fixed and a real WebView QA run passes.
- **P1:** require contract-level fix and regression proof before integration.
- **P2:** record device/UX follow-up, with no destructive migration.
- **NOT_TESTED:** real Android device tests, file picker interruption, notification
  permission side effects, storage exhaustion in Android WebView, third-party
  dependency scan, and full recursive secret scanning beyond the source files
  covered by this suite.

No app production fix was applied in RECOVERY-16 by design.
