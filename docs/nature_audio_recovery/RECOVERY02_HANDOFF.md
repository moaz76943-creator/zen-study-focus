# DF-013–DF-030 — Nature audio recovery lane 02

**Status: BLOCKED / NOT PRODUCTION READY.** Source of truth: [Issue #13](https://github.com/moaz76943-creator/zen-study-focus/issues/13). Inspected recovery baseline `632ef51ae6034224e6b459e0962a8bbedbf2b18e` and [PR #12](https://github.com/moaz76943-creator/zen-study-focus/pull/12) head `0743111c9caa2f37b82b3954403d3d2a2467d544`, Draft.

## Existing inventory / comparison before changes

Recovery `app.js` defines **12** selectable sound IDs: `ocean, rain, fire, forest, stream, leaves, waterfall, night, thunder, wind, winrain, earth`. Runtime dynamically builds tiles + independent sliders from that table. Preset Mix starts rain+fire; Stop All iterates all entries. Both `night.ogg` and `waterfall.ogg` returned GitHub 404 on recovery. `earth.ogg` is an air-conditioner hum rather than field recording. Older fallback generated fake crickets/waterfall when an Ogg failed.

PR #12 removes fake generated-audio fallback, disables the missing/mislabeled three sounds and makes short thunder one-shot, retaining **9** selectable existing Ogg files. It does **not** prove these nine have correct individual provenance or good sound fidelity. The PR also changes `app.js`, `index.html`, `integration_v22.js`, `MainActivity.java`, `docs/MEDIA_LICENSES.md`, analytics and regression tests. It blocks `ar/fa/ur`, which **conflicts with Issue #13's 20-language selection**. Do not merge it without lane 00 correcting that independent locale regression.

Checked accessible file prefixes: forest is Ogg/Vorbis, stream and thunder are Ogg/Opus; these are container clues **not Android decode evidence**. Some large binary files could not be retrieved through the connector; no comprehensive SHA256 or listening check is claimed. The existing forest/wind provenance references [Lelio88/dewdrop CREDITS.md](https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md). Wind maps to Freesound #240914 by bdvictor there, but individual original and converted SHA256 have not been produced. Every original sound stays blocked for release until individual provenance is proven.

## CC0 field-recording candidates — not packaged or audio-reviewed

| Target | Owner / exact source page | Verified page claim | Pending |
| --- | --- | --- | --- |
| Waterfall | [Tom_Kaszuba, Freesound #660255](https://freesound.org/people/Tom_Kaszuba/sounds/660255/) | CC0; small waterfall, stereo Sony PCM-D100, 64.615 s | Original download, original/converted hashes, codec, listening, loop, Android |
| Crickets night | [Vrymaa, Freesound #805466](https://freesound.org/people/Vrymaa/sounds/805466/) | CC0; real garden crickets, mono 61.116 s | Same |
| Crickets alternative | [nick121087, Freesound #476887](https://freesound.org/people/nick121087/sounds/476887/) | CC0; recorded in field with Roland R-26, stereo 48.725 s | Same |

Exact license URL for candidates: https://creativecommons.org/publicdomain/zero/1.0/ . **A page's CC0 label is not evidence that an unrelated downloaded file is identical to its recording**. No candidate bytes were obtained, no candidate was bundled, and no media SHA256 was fabricated. Original downloads may require account authorization.

## Owned isolated changes

- `android/app/src/main/assets/web/nature_audio_recovery_v1.js` exports opt-in `DeepFocusNatureAudioV1.createMixer(clips, options)`. Refuses remote, unverified, unpackaged, synthetic, absent-SHA256 and unsafe-path entries. Play/stop/stop-all, independent volume, summed gain limited to 1, 0% mute, pause/resume, teardown, generation-checked promise rejection and one-shot support. No network URLs or source rewriting; **not loaded by app yet**. Setting `verified:true` requires a real independent package/provenance approval.
- `tests/nature_audio_recovery/audit_media.cjs`: a **deliberately failing** per-asset release gate until original and converted SHA256, source page, owner, license, byte header, allowed Ogg codec and intended package path are all present. Rejects HTML disguised as .ogg, missing/empty/corrupt files and CC BY without attribution. `ffprobe` is a desktop codec check only, not Android proof. `media_manifest.json` records all 12 IDs as **unapproved** and distinguishes source research from installed assets.
- `tests/nature_audio_recovery/{mixer,audit}.test.cjs`: nine local Node behavioral/structural tests using mocked `HTMLAudioElement` and synthetic **invalid fixture headers only**, never synthesized nature recordings. Run with `node --test tests/nature_audio_recovery/*.test.cjs`. The unit tests passed locally (9/9); **CI not yet run for this branch**.

## Lane 00 integration-only patch (no shared files modified)

1. Review/reconcile PR #12 selectively: remove fake-sound fallback and invalid tiles without removing `ar/fa/ur`; preserve legacy data, `ZEN21::`, Android package ID and six/seven-tab functionality.
2. Lane 00 approves `android/app/src/main/assets/web/nature_audio/` for verified originals/conversions only. Never rename air conditioner noise as wind or invent original hashes. For EACH asset: upstream permalink, author, exact license URL, original SHA256, converted SHA256, modification chain, source acquisition date, duration, channels, true peak, measured loudness, listening record and Android decode confirmation. CC BY assets require in-app visible attribution and modification disclosure.
3. After accepted sound files actually exist, bridge the standalone mixer into the owned `app.js` and `index.html` and disable the old mixer for the same tile. Keep local-only `src`, one-shot thunder, localized errors and disabled/unavailable states. Do not enable waterfall/night from source-page research alone.
4. Android QA: airplane mode, old WebView/Opus/Vorbis, independent volume/multi-sound, clip/mix peak, >30-minute loops, interruptions, background/foreground, multiple stop/start sequences, persistent mute and media teardown. Run size checks on actual Android APK/AAB; record screenshots and hands-on listening findings.
5. **Gate**: `node tests/nature_audio_recovery/audit_media.cjs` **must exit nonzero now** until rights and actual bytes are supplied; do not weaken the gate to make CI green. Follow with `node --test tests/nature_audio_recovery/*.test.cjs`; real handset approval and human review are separate. Only lane 00 may edit `docs/MEDIA_LICENSES.md` after ownership of PR #12 is reconciled.

## Task status snapshot (never treat this as a completed audio delivery)

DF-013 inventory source **DONE**, handset reference **NOT TESTED**. DF-014 absent Ogg and HTML signature checks **PARTIAL**. DF-015 synth rejection **DONE in isolated module / PR #12 candidate**. DF-016–019 individual field-source research **PARTIAL**, converted/packaged replacement **BLOCKED**. DF-020–023 listening/normalization/loop validation **NOT TESTED**. DF-024–027 isolated module tests **PASS**, actual app integration **BLOCKED**. DF-028 documentation/audit gate **ADDED but intentionally BLOCKED**. DF-029 actual Play-size test **NOT TESTED**. DF-030 absent/mislabeled sounds **MUST REMAIN DISABLED**.

**This lane has no genuine new recordings to ship and cannot assert codec-on-device PASS, any newly recorded audio SHA256, or release readiness.**
