# Deep Focus — quality recovery master backlog

**Scope:** Real nature recordings, gentle non-musical end alarms, all supported languages, ASCII/Western digits 0–9, functional controls, simpler Notes/Tasks, accurate Analytics, and strong release QA.

**Source:** user's reported problems and 300-item ideas list, consolidated against current repository. **Baseline examined:** recovery `632ef51ae6034224e6b459e0962a8bbedbf2b18e` (2026-10-19). Recheck live state at execution.

> **STOP / CONFLICT:** PR #12 `fix/audio-english-analytics-20261019` already owns `app.js`, `index.html`, `analytics_studio.js`, `integration_v22.js`, `MainActivity.java`, `MEDIA_LICENSES.md`. Do not edit them concurrently. PR #12 currently filters out `ar/fa/ur` and forces English on startup/import, contrary to the 20-language requirement; fix this before approval. It does remove fake-audio fallback but does NOT replace weak recordings with proven licensed high-quality field recordings.

**Nonnegotiable:** No lost notes/tasks, no changes to `com.zenstudy.focus`, `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21`, `ZEN21::`, no force push, no fake focus sessions, no arbitrary remote scripts, no release signing changes, no direct `main` merge. Zero additional billing. UI locale text should follow selection; **every system/generated numeral must display 0–9**, not Arabic-Indic/Persian digits. Existing user-authored text is not forcibly translated or rewritten.

**Execution:** P0-first, one section at a time, small commits, documented source licenses, device QA. Each check stays unchecked until an exact SHA plus test/evidence is attached. One main recovery PR is preferred; avoid re-opening multiple competing code branches.

## 00 — Baseline and safe Termux agent setup (P0)
- [ ] **DF-001** Check live `main`, recovery branch `fix/v21-safe-release-recovery-20261018`, PR #1 and PR #12; record full commit SHAs.
- [ ] **DF-002** Do not run Gemini agents on `main`, recovery branch or PR #12 branch; create a dedicated topic branch off the latest tested recovery SHA.
- [ ] **DF-003** Before changes export an actual `ZEN21::` v21 backup on the user's Android phone and verify offline recovery with a disposable dataset.
- [ ] **DF-004** Capture current baseline screenshots and reproducible failures for each of the seven reported areas.
- [ ] **DF-005** Record current device Android/WebView version, screen dimensions, available disk space, and build runner constraints.
- [ ] **DF-006** Read `docs/contracts/DATA_COMPAT_V21.md`, `docs/MEDIA_LICENSES.md`, `docs/QA_08_RELEASE_AUDIT_20261019.md`, and relevant integration instructions.
- [ ] **DF-007** Verify all worktree statuses clean before the agent edits, and make only scoped incremental commits; do not rewrite working user files.
- [ ] **DF-008** Create an explicit PR conflict matrix for audio, locale, analytics, tasks, notes, and shared `app.js` / `index.html`.
- [ ] **DF-009** Adopt P0/P1/P2 and statuses TODO/BLOCKED/IN_PROGRESS/TESTED/DEFERRED with unique IDs in commit messages.
- [ ] **DF-010** Record commands, test output, changed files, failures, licenses and Git SHA after each small batch.
- [ ] **DF-011** Detect unsupported Gemini CLI/Termux platform and stop; never use random forks, sudo, `curl | sh` or insecure workarounds.
- [ ] **DF-012** Require human GitHub review before merges or changes to permissions, licensing, backups, signing, and release configuration.

## 01 — Authentic environmental sound recordings (P0)
- [ ] **DF-013** Enumerate every nature sound tile and corresponding packaged file, and confirm it is actually referenced at runtime.
- [ ] **DF-014** Detect missing, zero-byte, corrupted, HTML disguised as `.ogg`, undecodable or artificially synthesized nature content.
- [ ] **DF-015** Never silently generate synth-noise 'nature' as a replacement for a missing recording.
- [ ] **DF-016** Find field recordings for rain (light/heavy), waves, gentle stream, waterfall, forest/birds, leaves, soft wind, fire, nighttime crickets, distant thunder, café, and roof rain.
- [ ] **DF-017** Prioritize CC0/CC BY recordings whose individual source and redistribution rights can actually be verified; CC BY requires proper attribution.
- [ ] **DF-018** For EACH asset capture upstream URL, owner, exact license URL, attribution text, download date, original SHA256 and converted SHA256.
- [ ] **DF-019** Reject recordings with no reliable individual provenance, personal data, music, voices requiring clearance, or unclear commercial redistribution rights.
- [ ] **DF-020** Listen to every candidate at ordinary phone volume; screen for hiss, pops, clipping, sharp peaks, obvious loops, synthetic artifacts, and distracting noises.
- [ ] **DF-021** Verify codec support and actual decode on Android WebView, not merely `.ogg` filename and desktop `ffprobe` success.
- [ ] **DF-022** Normalize recording loudness conservatively without aggressive compression or clipping; prevent combined mixer peak overload.
- [ ] **DF-023** Create pleasant stable loops with sufficient duration and short crossfade only when necessary; thunder should not loop every few seconds.
- [ ] **DF-024** Provide graceful unavailable-state per tile and local fallback silence/error, never streams or unverified effects.
- [ ] **DF-025** Verify simultaneous playback, independent volume, mute at 0%, pause, resume, stop-all, app background/foreground and teardown.
- [ ] **DF-026** Prevent duplicate sound instances, stale promises, stuck audio, and AudioContext/HTMLAudio resource leaks.
- [ ] **DF-027** Keep the core ambient playback completely offline; avoid permissions not required for playback.
- [ ] **DF-028** Maintain `docs/MEDIA_LICENSES.md` as a per-asset artifact and add automated provenance/codec/hash checks.
- [ ] **DF-029** Verify package size after replacement and ensure Google Play delivery constraints are respected.
- [ ] **DF-030** Do not activate previously hidden/invalid sound tiles until their authentic and legally distributable recordings are included.

## 02 — Pleasant end-of-session alerts (P0)
- [ ] **DF-031** Provide a small picker (minimum five options) of clear, soft **non-musical** completion sounds, including a silent option.
- [ ] **DF-032** Consider soft single bell, wooden chime, gentle water drop, small soft gong, two short natural percussive taps; no melodies/music.
- [ ] **DF-033** Obtain each sound with verified individual CC0 or compatible license and provenance before bundling.
- [ ] **DF-034** Normalize alert loudness; cap sudden peaks, remove clicks, harsh high frequencies, and long reverb tails.
- [ ] **DF-035** Preview sounds in settings with volume control, cancellation and only one preview playing at a time.
- [ ] **DF-036** Persist selected sound/volume in existing config safely and retain stable fallback if asset unavailable.
- [ ] **DF-037** Respect silent mode, Do Not Disturb, notification permission, audio focus, alarms and user's mute preference as platform-appropriate.
- [ ] **DF-038** Distinguish focus completion vs short rest vs long rest where useful but avoid repeated or intrusive alarm loops.
- [ ] **DF-039** Test background, locked screen, audio focus interruption, Bluetooth/headphones and rapid successive sessions.
- [ ] **DF-040** Check alerts do not play twice after timer restoration and callback retries.
- [ ] **DF-041** Write tests for silence, disabled alerts, no asset, user volume 0, pause/dispose, and repeated completion id.
- [ ] **DF-042** Document sound sources, exact licenses and attribution along with ambient recordings.

## 03 — Real 20-language localization (P0)
- [ ] **DF-043** Restore or maintain all **20 originally supported language choices**; do NOT quietly remove `ar`, `fa`, or `ur` to hide untranslated strings.
- [ ] **DF-044** OWNER DECISION REQUIRED if prior request to suppress ALL Arabic script is intended literally: current request says all 20 selected languages should work. Default to language-faithful UI.
- [ ] **DF-045** Keep selected interface language stable after restart, session restore and backup import.
- [ ] **DF-046** Inventory every visible string in HTML, JavaScript templates, alerts, buttons, tooltips, modals, error toasts and Android-native UI.
- [ ] **DF-047** Remove or map every static English string in Arabic/German/Spanish/other non-English modes.
- [ ] **DF-048** Cover Notes Studio, Tasks Studio, Analytics Studio, timers, training, sounds, goals, backup flows and calendar.
- [ ] **DF-049** Create a canonical key registry; avoid multiple independent dictionaries for the same key with divergent translations.
- [ ] **DF-050** Validate exact parity of key sets for the registered 20 language codes in CI.
- [ ] **DF-051** Eliminate literal internal i18n key placeholders, undefined/null and empty strings in the UI.
- [ ] **DF-052** Use language-appropriate plurals and date/weekday names but not non-Western digit glyphs.
- [ ] **DF-053** Ensure RTL applies to interface correctly and does not reverse original note/task body contents.
- [ ] **DF-054** Enforce no unwanted Arabic-script strings in NON-Arabic UIs, while preserving Arabic only when the Arabic locale is selected.
- [ ] **DF-055** Handle language switch in already-open modals and re-render dynamic components, without data mutation.
- [ ] **DF-056** Test on narrow mobile screens with longer German/French/Russian strings and screen reader labels.
- [ ] **DF-057** Add Android native bridge translations for save dialogs, download/export errors and notifications.
- [ ] **DF-058** Test all 20 languages with screenshot snapshots and per-screen DOM inventory; distinguish not-yet-tested from PASS.
- [ ] **DF-059** Do not translate user-entered note titles or task descriptions, and do not drop historical note content.

## 04 — Global Western digits 0123456789 (P0)
- [ ] **DF-060** Enforce ASCII digits 0-9 for ALL rendered counters regardless of UI language (Arabic, Persian, Urdu included).
- [ ] **DF-061** Cover timer, training rounds, dates, calendar, goal %, task counts, notes counters, daily/week/month chart labels, SVG axis labels, tooltips, legends, downloads.
- [ ] **DF-062** Prevent `Intl.NumberFormat` locale defaults from yielding Arabic-Indic/Eastern Arabic numerals; force `latn` numbering system with tested fallback.
- [ ] **DF-063** Keep digits 0-9 in numeric input fields including Android numeric keyboard and validation messages.
- [ ] **DF-064** Do not change identifiers, text bodies, filenames, translations or stored user data just to normalize display digits.
- [ ] **DF-065** Ensure numbers remain correctly ordered in RTL; use bidi isolation (`bdi`, `dir=ltr`) for numeric segments.
- [ ] **DF-066** Add automated DOM + SVG assertions forbidding U+0660–U+0669 and U+06F0–U+06F9 in GENERATED NUMBER UI.
- [ ] **DF-067** Test representative values 0, 9, 10, 25, 100, 1234, -2, 0.75, 100%, 2026-10-19 and 00:05.
- [ ] **DF-068** Ensure CSV is invariant and exported with ASCII digits, date keys and culture-neutral numeric decimal separator.
- [ ] **DF-069** Test first render, tab switch, state update, hot locale change, resumed timer and restored backup.

## 05 — Make every click useful and errors intelligible (P0)
- [ ] **DF-070** Inventory all `onclick`, addEventListener, pressable cards, menu items and tab actions across EVERY screen.
- [ ] **DF-071** Automatically detect missing handlers, duplicate conflicting global functions and incorrect script load order.
- [ ] **DF-072** Classify each tap target: action, navigation, informative non-clickable display, disabled with reason, or remove.
- [ ] **DF-073** Remove misleading tap affordances from analytics KPI cards unless a genuine detail drilldown exists.
- [ ] **DF-074** Ensure all forms validate inputs and provide specific recovery instructions rather than cryptic code/error names.
- [ ] **DF-075** Ensure save/copy/export/share/delete/retry controls report confirmed results, never optimistic success.
- [ ] **DF-076** Make empty-state call-to-action buttons actually open a relevant editor or page.
- [ ] **DF-077** Enable close, back, cancel and Escape behavior for each modal without losing unsaved work.
- [ ] **DF-078** Prevent double submit, race conditions and duplicate tasks/notes/session events from rapid double taps.
- [ ] **DF-079** Capture console errors and JS exceptions (without personal data) in a reproducible QA report.
- [ ] **DF-080** Test Android back button, keyboard open, focus traps, screen reader navigation and orientation.
- [ ] **DF-081** Exercise drag, swipe and press events on real touch input; always offer a tap-based alternative.
- [ ] **DF-082** Test clipboard unavailability, SAF export denied/cancelled, closed document stream, storage full and old device behavior.
- [ ] **DF-083** Render localized human-readable error messages and a useful retry mechanism.
- [ ] **DF-084** Use event-driven regression tests for at least 100 critical tap targets rather than checking that onclick strings merely exist.

## 06 — Notes Studio useful, fast and safe (P1)
- [ ] **DF-085** Offer an uncluttered notes home: search, compact notebook/tag chips, pinned/recent notes, clear + action.
- [ ] **DF-086** Separate quick capture from full editor and reduce new-note taps to one.
- [ ] **DF-087** Finish rich editor toolbar for heading, bullets, ordered list, checkbox, quote, undo/redo and safe preview.
- [ ] **DF-088** Make Cornell cues, main notes, summary separate fields with old-note view/edit compatibility.
- [ ] **DF-089** Use full-height distraction-free writing mode with Android keyboard-safe toolbar, back/close confirmation.
- [ ] **DF-090** Implement reliable per-note drafts with verified save result and conflict detection; never overwrite a newer saved note silently.
- [ ] **DF-091** Implement archive/trash/restore without ID changes or destructive mass deletion.
- [ ] **DF-092** Support simple notebooks and multiple tags without nested complexity; fast filters/sorting/search.
- [ ] **DF-093** Make note detail and reading mode beautiful, airy and readable, with mixed RTL/LTR content.
- [ ] **DF-094** Implement interactive checkboxes where supported and truthful checklist progress.
- [ ] **DF-095** Offer highlight/selection and headings/TOC for long notes without heavy editor framework.
- [ ] **DF-096** Enable secure internal note links/backlinks by stable numeric ID and predictable missing-target behavior.
- [ ] **DF-097** Link notes to tasks and calendar with atomic/best-effort recovery per v21 contract.
- [ ] **DF-098** Extract checklist tasks with confirmation, stable extraction key and dedupe.
- [ ] **DF-099** Make active recall question/answer/cornell review usable in no-more-than-three-tap flows.
- [ ] **DF-100** Preserve all old note content and unknown fields; sanitize note Markdown and disallow JS URLs/XSS.
- [ ] **DF-101** Count only real user-created notes and real properties; no fake reading or focus time.
- [ ] **DF-102** Provide export TXT/Markdown and safe Android PDF/print after real-world tests.
- [ ] **DF-103** Test 1,000/5,000 notes, long bodies, 320px displays, Arabic paragraphs and storage quota failure.
- [ ] **DF-104** Use progressive disclosure to avoid clutter; group advanced commands under overflow menu.

## 07 — Tasks that feel simple, not complicated (P1)
- [ ] **DF-105** Make adding a task one tap plus text; move advanced fields into optional details.
- [ ] **DF-106** Design each collapsed task card with title, one status, due indicator and primary action only.
- [ ] **DF-107** Make edit, complete, reopen, archive, trash/restore and Undo reliable and discoverable.
- [ ] **DF-108** Support subtasks and checklists with compact inline progress.
- [ ] **DF-109** Support optional projects, due date/time, priority and activity without requiring them for basic tasks.
- [ ] **DF-110** Offer Today / Upcoming / Overdue / Completed views, with quick reschedule.
- [ ] **DF-111** Allow picking top three daily priorities manually.
- [ ] **DF-112** Connect a task to focus timer by stable numeric task ID and record only real completed activity.
- [ ] **DF-113** Prevent double-counting focus time and duplicate completed occurrences for recurring tasks.
- [ ] **DF-114** Implement safe daily/weekday/weekly repeat rules and one occurrence per due window.
- [ ] **DF-115** Compute real project progress from genuine tasks, not sample/startup items.
- [ ] **DF-116** Connect tasks to notes and actual calendar dates and update links on archive/restore.
- [ ] **DF-117** Provide search/filter/sort and alternate tap controls for reorder; avoid mandatory drag-and-drop.
- [ ] **DF-118** Display planned vs actually recorded focused minutes when data exists, not invented numbers.
- [ ] **DF-119** Keep v21 `id`, `catKey`, `date`, `done`, `isStarter` and all unknown fields on migration/edit.
- [ ] **DF-120** Test 1,000 tasks, repeats across DST, storage failures and restoration.

## 08 — Deep truthful analytics (P0)
- [ ] **DF-121** Show actual history-based totals from v21 `id,date,minutes,domain`; do not require missing start/end timestamps.
- [ ] **DF-122** Ensure one canonical analytics source, dedupe by unique valid session ID, report conflicting duplicates.
- [ ] **DF-123** Exclude corrupt, sample, unfinished/non-focus activity when reliable status exists; document legacy limitations.
- [ ] **DF-124** Never infer historic start hour or crossing midnight without trustworthy timestamps.
- [ ] **DF-125** Provide a useful dashboard: today/7 days/30 days, sessions, activity split, true goals.
- [ ] **DF-126** Provide weekly comparison with correct denominators and explicit empty period behavior.
- [ ] **DF-127** Add user-controlled date range and activity filters with validation and reset.
- [ ] **DF-128** Make each graph interactive only if it actually drills into data; no decorative dead cards.
- [ ] **DF-129** Use lightweight accessible SVG charts with ASCII 0-9 ticks, labels, legends, tooltips and tab focus.
- [ ] **DF-130** Provide meaningful zero-data states, no hard-coded percentages or demo productivity streaks.
- [ ] **DF-131** Allow CSV export through Android SAF with explicit successful/failed/cancelled UI result.
- [ ] **DF-132** Show links to actual task/session detail only when real relationships are recorded.
- [ ] **DF-133** Keep chart render speed acceptable with 10,000+ histories; no unnecessary animation.
- [ ] **DF-134** Validate streak rules, local day/week, time-zone shifts, leap day, partial week and DST.
- [ ] **DF-135** Preserve ability to compare daily/weekly goals only when original target snapshots exist.
- [ ] **DF-136** Test hidden charts, repeated analytics tab activation, reversed range and filter clearing.
- [ ] **DF-137** Never place Arabic-Indic/Eastern Arabic digits in chart SVG text or visual labels.

## 09 — White Premium consistent interface (P1)
- [ ] **DF-138** Use existing white design tokens and unify typography, surface, shadows, borders, icon stroke and spacing.
- [ ] **DF-139** Center timer in bottom bar exactly and keep quick training adjacent; retain access to all seven features.
- [ ] **DF-140** Make home primary focus timer, quick activity presets, daily plan and goals; hide secondary complexity.
- [ ] **DF-141** Use full-width touch targets, mobile keyboard-safe dialog height and overflow menus.
- [ ] **DF-142** Respect logical properties RTL/LTR and safe areas; do not blindly mirror numeric data.
- [ ] **DF-143** Verify 320/360/393/430px screen layouts and Android font scaling 100–200%.
- [ ] **DF-144** Use 44dp-equivalent tappable targets where practical and clear focus indicators.
- [ ] **DF-145** Make every success/failure/loading/empty state visually consistent.
- [ ] **DF-146** Ensure bright white appearance without glary low-contrast text or heavy blur.
- [ ] **DF-147** Check reduced motion, TalkBack labels and keyboard navigation.

## 10 — Gates, rollout and release (P0)
- [ ] **DF-148** Run initial baseline Node and Python tests before any feature changes; log only verified green results.
- [ ] **DF-149** After each batch run syntax, focused tests, smoke, and source-safety regression; do not weaken assertions to hide errors.
- [ ] **DF-150** Add automated checks for audio asset codec/source/license entries and non-synth fallback.
- [ ] **DF-151** Add 20-language DOM/screenshot coverage with Arabic UI test and global ASCII-digit enforcement.
- [ ] **DF-152** Add real WebView tap and media tests for at least one Android device or clearly mark NOT_TESTED.
- [ ] **DF-153** Test offline mode, low storage, app background, kill/restart, activity recreation and Android permission denial.
- [ ] **DF-154** Verify v21 backup round-trip, IDs and unknown fields preserved, draft conflict and rollback on partial write.
- [ ] **DF-155** Verify notes-to-task-to-focus-to-analytics end-to-end without invented minutes.
- [ ] **DF-156** Build Debug APK and unsigned AAB from exact HEAD SHA through existing GitHub Actions; preserve zero-additional-billing path.
- [ ] **DF-157** Keep production Play signing, permissions, package `com.zenstudy.focus`, v21 keys and `ZEN21::` unchanged.
- [ ] **DF-158** Never merge into `main` or publish to Play from an agent. Produce a human-reviewed draft PR and truthful PASS/FAIL/BLOCKED matrix.
- [ ] **DF-159** On any P0 test failure stop and revert the last narrow change; do not delete data or reset state.
- [ ] **DF-160** Stop after at most two repair attempts per root cause; escalate with logs and reproducible steps.
- [ ] **DF-161** Update media source document, QA report and changelog with changed files, SHAs and affected supported languages.

## Acceptance of complete program

- [ ] All required P0 tasks verified on the exact integrated HEAD.
- [ ] All 20 selectable UI languages work, including Arabic/Persian/Urdu unless owner explicitly changes language scope.
- [ ] Every generated numeric UI value uses ASCII 0123456789 across DOM, SVG and exports.
- [ ] Every shipped nature and completion sound has attributable provenance, compatible license, valid audio, on-device listening proof and smooth/appropriate playback.
- [ ] Critical Notes/Tasks controls require no fake/example data and show explicit safe results on failure.
- [ ] No misleading Analytics action or unverified export success.
- [ ] End-to-end backup round-trip and notes→tasks→focus→analytics path pass.
- [ ] CI and Android test-build pass. Actual Android media/device QA recorded, NOT_TESTED if unavailable.
- [ ] QA blockers explicitly listed; production not claimed READY without separate release checks.

