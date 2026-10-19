# DEEP-FOCUS-RECOVERY-15 — UX report and integration handoff

**Status:** Review-only interactive prototype; NOT integrated; NOT Android-device-tested.  
**Repository:** moaz76943-creator/zen-study-focus  
**Audit starting point:** PR #25 at \`0dd9239bc28978e11f41c1c0f618c9662b291fe2\` (2026-10-19).  
**Issue:** #13. **Owner:** lane 15 (independent UI concept); app integration belongs to recovery lane 00.  
**Design direction:** White Premium Futuristic — soft white surfaces, restrained cyan/blue/violet, quiet information hierarchy, 44px minimum interactive controls.

## Scope and inspected existing implementation

Read live PR #25 metadata and its tree. Inspected:
- \`android/app/src/main/assets/web/tasks_studio.js\` and \`docs/tasks_recovery/INTEGRATION.md\`
- \`android/app/src/main/assets/web/notes_studio.js\`, \`notes_editor_ui.js\`
- \`docs/notes_recovery/DF-085-104-HANDOFF.md\`, \`tests/notes_ui/INTEGRATION.md\`
- \`design_tokens_v22.css\`, \`ui_components_v22.css\`, \`docs/design_recovery/RECOVERY10_HANDOFF.md\`

**Confirmed from code/contracts, not from on-device execution:** Tasks Studio already supplies quick entry, edit, completion/reopen, checklist/subtasks, top-three selection, filters, search, trash/recovery and optional timer linking. Notes Editor UI already supplies quick/editor actions, Cornell fields, recall, reader, draft safeguards, search, checklist progress, revisions and guarded save actions. The planned UX must reuse these capabilities. Actual integration and persistence remain gated on the adapters described below. The static source review does not prove the installed APK currently renders every feature.

## Interaction-friction review

Existing modules expose sophisticated options and separate card actions; daily-use capture and obvious next action must remain prominent. This lane uses **one primary action per card**, a visible edit/read action, and a collapsible **More** area for destructive and less frequent actions. No KPI/card is given a fake tap affordance. Empty-state CTAs focus the real input or open the note editor. User-authored titles and text are never transliterated or changed during a locale switch.

Tap counts below describe the **UX15 demo only**, measured as explicit controls activated (not text keystrokes). Baseline APK tap counts are **NOT MEASURED**; a static code audit cannot substitute for task-observation on Android.

| Flow in standalone UX15 prototype | Control activations (excluding typing) | Outcome |
|---|---:|---|
| New quick task | 2: focus entry + Add/Enter | Adds disposable model task and displays card |
| Complete/reopen task | 1 | Toggles in demo model; updates state |
| Choose/remove a top-three priority | 1 | Toggles up to three unfinished tasks |
| Edit title or optional due date | 2 minimum: Edit + Save, plus field focus | Validated demo model update |
| Mark an existing checklist step | 2: More + step checkbox | Updates step progress |
| Add new checklist step | 3 minimum: More + field + Add step | Adds demo step |
| Open note reader | 1 | Safe read-only text and Cornell fields |
| Create quick note | 3 minimum: New note + field + Save | Adds disposable note |
| Create Cornell note | 4 control activations for open, More, type and Save, plus text-field focus | Stores separate cues, notes and summary in demo |
| Search/filter | 1 to focus or select, with immediate results | No extra Apply button |
| Delete/Undo | 3: More + Delete + Undo | Undo restores removed demo item |

The counts are **not** a claim that all on-device interactions meet these targets. Real TalkBack, IME and focus navigation need dedicated observation.

## Delivered files and functions

- \`design/ux_recovery15/index.html\`: semantic task/notes preview and actual controls, forms, labels, dialogs, empty states, live notices.
- \`design/ux_recovery15/styles.css\`: \`.ux15\`-scoped component CSS; light surfaces, accents, 44px touch, narrow viewport, overflow-safe long labels, RTL and reduced motion.
- \`design/ux_recovery15/prototype.js\`: no external dependencies, \`createModel()\` (in-memory and directly testable) and \`attach(document)\`. Implements task quick capture/edit/complete/top-three/checklist/delete/undo; note quick/Cornell create/edit/search/read/delete/undo; dynamic Arabic/English demo labels; Escape and Tab focus trapping in dialogs; atomic validation for demo task patches.
- \`tests/ux_recovery15/prototype.test.cjs\`: Node test specifications for data actions, regressions, HTML semantics, stylesheet guardrails, demo isolation and locale parity.
- This report.

**No changes to:** \`app.js\`, \`index.html\` in Android assets, \`tasks_studio.js\`, Notes modules, runtime CSS, Android bridge, package ID, data schema, \`ZEN21::\`, CI or workflows. No remote scripts, fonts, SDKs or paid tools.

### Prototype behavior and limits

The preview starts with deliberately fictional sample tasks and a note. All edits are held in memory and are discarded on refresh. Its success notice specifically says the **demo model** was updated. There are no timers, analytics calculations, completed focus events, real persistence, note/task import, SAF export, notifications or production adapters. Prototype language switch supports Arabic and English as examples only; the production app's **20 locale** parity belongs to the localization lane. Names typed by a user are displayed using text nodes, not unsafe \`innerHTML\`. Cornell fields have distinct reader sections; reader text is not modified by clicking on it.

## Integration contracts for lane 00 (not implemented here)

| UX15 interaction | Approved production target | Mandatory integration condition |
|---|---|---|
| Quick task add and edit | \`DeepFocusTasksStudioV21.mount(root, adapter)\` | Use its own Core-backed handlers; do not use the demo's in-memory IDs |
| Complete/reopen/checklist/top three | Tasks Studio + Tasks Core v21 | Existing numeric IDs, unknown fields and state remain intact |
| Task persistence | Tasks Studio \`adapter.commit(before,after)\` | Synchronous, durable, atomic cfg/tasks write that **throws** on failure; never claim success on swallowed quota errors |
| Timer link | \`adapter.linkTaskToTimer(id:number)\` | Only after real persistent timer/session contract; no fabricated minutes or duplicate focus sessions |
| New/edit note/Cornell | \`DeepFocusNotesEditorUI.install(adapter)\` with Notes Core v21 | \`readState\`, \`nextNumericId\`, \`commitNotes\`, \`now\`, \`locale\`, \`notify\`; a commit acknowledgement is exactly \`true\` |
| Note reading/search/checkboxes | Existing Notes Editor UI | Reader checkboxes are read-only by contract; editor writes must use verified commit |
| Note→task creation | \`commitBoth(before,after)\` + explicit extraction approval | Atomically persist both families or disable; never half-save |
| Real delete/undo/recover | Existing Notes/Tasks cores | Preserve archive/trash protections and backup acknowledgement; the demo's simple undo is **not** a drop-in replacement |
| Localization | 20-language locale integration | Re-render open dialogs and dynamic labels; preserve user-authored text and ASCII displayed numbers |
| Android Back / keyboard / safe areas | Integration-owned WebView shell | Do not just treat browser Escape as Android Back |
| Real exports/clipboard | Existing Notes read/copy bridge and Android SAF | Only show confirmed success; never describe clipboard copy as file export |
| Search/filter | Existing Core query APIs | Preserve pagination correctness and 5,000-note scale |
| Theme integration | Already integrated v22 token layer & design recovery 10 | Map UX15 token intent onto \`df-v22\`; **do not copy** demo root CSS into runtime or duplicate theme tokens |

Do not silently activate a second Tasks Studio beside the legacy task screen or re-mount Notes UI twice. Adopt UX15 layout/patterns by **selective integration** with the real runtime components, not by mounting \`prototype.js\` into the APK. It is a UX reference implementation, NOT production application code.

## Verification and gates

**Executed:** 15 isolated JavaScript model/static assertions in V8; additionally reproduced two regressions (invalid title consumed task ID, invalid due date partially modified an item) before fixing both and rechecking their passing outcomes. A separate V8 syntax/model check passed after focus/accessibility updates.

**Committed but not executed in Node here:** \`tests/ux_recovery15/prototype.test.cjs\`. There is no checked-out runnable repository in this tool environment. Existing GitHub Actions workflow currently runs explicit test folder globs **excluding** \`tests/ux_recovery15\`; CI coverage remains blocked until lane 00 includes this suite. Tests of whole-file parsing, clickable browser UI, focus trap, mobile viewport rendering, 20-language screenshots, Android keyboard, real durable storage, quota, process death and physical-device E2E are **NOT TESTED**. Do not mark any as PASS based on static inspection or a V8 logic test.

To run after checkout:
\`\`\`sh
node --check design/ux_recovery15/prototype.js
node --test tests/ux_recovery15/*.test.cjs
# Open design/ux_recovery15/index.html in a modern browser for manual keyboard/touch QA.
\`\`\`

Suggested device QA matrix: widths 320/360/390/412px; 200% text scale; Arabic RTL and long German text; hardware Tab/Shift+Tab/Escape; software keyboard and screen rotation; TalkBack button/label announcements; exact search; 5,000 notes/1,000 tasks with existing production engines; failed commit/no optimistic confirmation; live 20-language switch in open editors; restore after Android process death. No APK was built by lane 15.

## Integration review decision

**DRAFT / NOT MERGEABLE INTO RELEASE** until the lane-00 owner has applied the relevant interaction patterns to the actual Notes/Tasks modules, verified the durable adapters against v21 primary/mirror/journal and backups, added test discovery to CI, and completed Android/WebView accessibility and storage-failure QA. PR #25 and the Gemini work remain untouched. A human review is required before promotion or release.
