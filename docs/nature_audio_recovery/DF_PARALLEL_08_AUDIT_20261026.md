# DF-PARALLEL-08 — Audio inventory and safe remediation

Date: 2026-10-26
Baseline: `integration/master-qa-verified-v21` at `e2bb272054768615b5dbabbcd45f3f57f0d633d7`.
Scope: isolated JS audio guard and tests. No native, v21 persistence, `app.js`, audio bytes, or APK activation touched.

## Exact baseline inventory

- `app.js` renders 12 nature tiles, but `sounds/` has only 10 of their expected recordings. `sounds/night.ogg` and `sounds/waterfall.ogg` do **not** exist; current app attempts synthesized fallback.
- `sounds/earth.ogg` and `sounds/noise.ogg` are the **same Git blob** `6267d90ab384e818ec1c4c624cbb52a84814a6fd` (728383 bytes), not independent original recordings.
- Six independent `audio/*.mp3` paths exist. They are not the 12 `sounds/*.ogg` catalog paths; no permission to present them as drop-in approved replacements.
- `docs/MEDIA_LICENSES.md` discusses individual provenance for forest and wind, but does not certify all the existing assets for commercial distribution.
- Historical #59, #87, #90, #163 expand quarantined recording *candidates* toward 20 sources. Candidate source strings, container decoding and SHA alone do **not** satisfy rights proof, human listening, or locked-screen Android playback. No 20-track release approval can be inferred.
- Historical #90 reported hidden-phase underruns in an isolated AudioQA APK; not proof of success or failure of 20 sounds in the production app.

## Implemented in this bounded change

- Audio guard refuses non-approved metadata, `ready:false`, missing/invalid SHA-256, absent HTTPS licence evidence, unsafe/offline media paths and non-HTTPS source.
- Acknowledges the distinction between **metadata gate** and independent **file-level verification**. Mock SHA-256 and URLs in unit tests are deliberately not licence certificates.
- `stopSoundChannel` handles HTMLAudioElement `pause()` as well as nonstandard engine `stop()` and attempts to reset playback position. `stopAllSoundChannels` follows the same cleanup path without changing timer state.
- `setSoundChannelVolume` adjusts the selected channel only and rejects out-of-range volumes.
- Rejected asynchronous `play()` promises clean up their own active channel without stopping a newer replacement.
- Focused audio/lock-screen mock tests updated; **no claim of hardware Android testing** and no claim that this independent guard is wired into the 12-tile production player.

## Legacy PR disposition / blocked work

| PRs | Disposition | Reason |
| --- | --- | --- |
| #17, #26 | Do not merge blindly | Unresolved source-to-derived rights proof and old duplicated candidate bytes. |
| #24 | Keep separate | Alert cues are a distinct feature; test the real alert integration and licence evidence before acceptance. |
| #35, #40 | Require selective comparison | Both touch shared `app.js`; current audio locale bridge already covers parts, and other lanes own UI edits. |
| #59, #87 | Quarantined material only | Original Commons intake is useful, but not proof of 20 approved production loops. |
| #90 | Do not activate | Hidden/background AudioQA failures remain unresolved. |
| #116 | Reject as incompatible | Optimizes **synthesized fallback**, not genuine field recordings. |
| #163 | Useful audit baseline | Safety/test-only content may be ported independently once target dependencies are reconciled. |

**Open before audio acceptance:** confirm every actual shipped file's independent owner/licence/commercial redistribution right and digest, verify decoded audio and looping, inspect no duplicates/mislabelling, confirm alert routing, and test foreground/background/screen-off/Stop All on Android API30/API35. Keep `RELEASE_APPROVED=NO`.
