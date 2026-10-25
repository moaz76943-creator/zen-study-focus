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
- Local Node 22: `node --test tests/i18n/audio_settings/audio_settings_localization.test.cjs` -> 7/7 PASS.

## Required integrator handoff — lane 03
**This change does not yet run in the APK.** Owner of `index.html` must load `js/locale_audio_settings_bridge.js` after `app.js` (or before with deferred call) and call `DeepFocusAudioSettingsLocale.bindSoundStudio({document,locale:cfg.lang,catalog:SOUNDS_DATA,category:soundCat,legacy:{locale:cfg.lang,sounds:L().sounds}})` **after each** `renderSoundsStudio()` and language switch.

Do not edit `app.js`, `index.html` or `js/global_i18n_registry.js` from this lane. The Settings/Backup dialogs and runtime unavailable-audio toasts still need explicit caller integration. Android lifecycle/media playback and native accessibility remain NOT_TESTED. No release approval is implied.
