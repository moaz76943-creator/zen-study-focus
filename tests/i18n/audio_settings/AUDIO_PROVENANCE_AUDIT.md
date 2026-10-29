# DF-LANE-10 — Audio/Settings QA and provenance checkpoint (2026-10-25)

Base: `integration/master-qa-verified-v21`. Scope limited to the two authorized modules and `tests/i18n/audio_settings/`.

## Runtime inventory
- `app.js` displays **12** nature tiles: ocean, rain, fire, forest, stream, leaves, waterfall, night, thunder, wind, winrain, earth.
- Existing `sounds/` contains 10 matching Ogg filenames. **`sounds/night.ogg` and `sounds/waterfall.ogg` are absent.** The existing app uses a synthesized, non-recorded fallback when playback fails; do not market either as an authentic nature recording.
- `audio/` contains six separate MP3 files; they are not the 12 tile file paths and have not been reclassified or modified.
- Alert labels and settings / backup-restore confirmation messages are exposed as translation keys. Existing playback and backup dialog logic remain unchanged.

## Provenance
- `docs/MEDIA_LICENSES.md` documents cited provenance for `sounds/forest.ogg` and `sounds/wind.ogg`; independent rights verification was **not performed** in this lane.
- Most pre-existing audio recordings still lack independently reviewed per-asset commercial redistribution permission. The media gate remains **BLOCKED**.
- No audio was downloaded, generated, replaced, renamed or given a speculative license.

## Implementation and validation
- Five complete hand-authored, key-parity Audio/Settings namespace packs: `en`, `ar`, `de`, `es`, `fr`. Other requested locales use **explicit English fallback** and must not be counted as translated.
- Display-only `DeepFocusAudioSettingsLocale.bindSoundStudio` translates visible tile text, group labels, sliders' ARIA labels, and mixer buttons without altering DOM slider value, app configuration, session history, file path, media playback or local storage.
- Optional `DeepFocusSoundMixer.attachLifecycle(document,{stopOnBackground:true})` stops active sounds only if the caller explicitly selects this behavior. Default remains background-passive; language changes do not trigger stop/play.
- Local Node 22: `node --test tests/i18n/audio_settings/audio_settings_localization.test.cjs` -> 9/9 PASS at head before document-only change. `node --check` for both runtime modules and test source PASS. RED regressions were reproduced for keyboard activation, excluded legacy locale bleed, and native-button double activation.

## Required integrator handoff — lane 03
**This change does not yet run in the APK.** Owner of `index.html` must load `js/locale_audio_settings_bridge.js` after `app.js` (or before with deferred call) and call `DeepFocusAudioSettingsLocale.bindSoundStudio({document,locale:cfg.lang,catalog:SOUNDS_DATA,category:soundCat,legacy:{locale:cfg.lang,sounds:L().sounds}})` **after each** `renderSoundsStudio()` and language switch.

Do not edit `app.js`, `index.html` or `js/global_i18n_registry.js` from this lane. The Settings/Backup dialogs and runtime unavailable-audio toasts still need explicit caller integration. Android lifecycle/media playback and native accessibility remain NOT_TESTED. No release approval is implied.

## Lane 03 ownership and follow-up
- Integration issue: https://github.com/moaz76943-creator/zen-study-focus/issues/255
- The bridge now binds independent keyboard-operable play controls, aria-pressed and a separately focusable volume slider. Native `<button>` controls rely on browser keyboard activation, avoiding duplicate clicks when PR #90 is integrated.
- Excluded Hebrew legacy labels are rejected even if legacy locale normalization would otherwise alias them to English.
- 'Ready' wording was replaced by neutral 'Nature sound controls' because two recordings are absent and not commercially approved.
- Repo Actions and Android WebView were not executed for this head; do not infer them from local Node verification.

## DF-LANE-10 incremental checkpoint — WebView backup locale and excluded-locale truth
- Added 9 reviewed backup modal strings to each of the 5 already-authored language packs: en/ar/de/es/fr. All preserve the crucial security warning: exported **backup codes contain readable private notes/tasks and are NOT encrypted**. No claims about `.zenbackup` encryption were changed.
- New **opt-in, display-only** `DeepFocusAudioSettingsLocale.bindBackupDialog({document,locale:cfg.lang})` targets existing WebView `#cloudBackupModal` structure. It validates required nodes before any change, then modifies only seven static labels, one textarea **placeholder** (never the value), and the close button ARIA label.
- No script injection, timer/audio changes, storage writes, data migration, backup export/restore behavior, or native Android strings. Incomplete DOM safely skips without partial translation.
- `metadata('he'/'iw')` now returns **fallback=true, complete=false** to avoid counting excluded codes as translated.
- Test-first validation: 9 baseline V8 cases pass, then 3 expected RED tests (missing 9 keys, missing binder) and 1 additional RED test (excluded locale metadata); after implementation **13/13 V8-executed tests PASS** on the exact remote source blobs.
- Direct Node CLI, full repository test matrix, Android WebView/TalkBack, and physical backup/restore verification are **NOT_TESTED**. Do not present V8 as Node/Android certification.
- Lane 03 must load the bridge script from local assets and call `bindBackupDialog` on first showing the backup modal and on language changes, **without** altering any existing confirmation, file chooser, or restore flow. Android-native dialogs belong to Lane 12.
