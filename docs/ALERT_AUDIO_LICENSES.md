# Completion-alert source and redistribution register

**Scope:** DF-031..DF-042 only, 2026-10-19. This document does NOT certify ambient/nature library `sounds/`.
Five original recordings were fetched from individually identified files under two upstream open-source repos. Originals were analyzed and converted into local mono PCM 16-bit/44.1 kHz clips with conservative gain and 6ms/24ms attack/release smoothing. "Two soft wooden taps" uses two evenly spaced copies of an acoustic claves hit. None is generated from sine/noise synthesis. No melody, streaming, or additional permission is required.

**License:** Versilian Community Sample Library (VCSL), copyright owner Versilian Studios LLC, [CC0-1.0 upstream licence](https://github.com/sgossner/VCSL/blob/master/LICENSE); [VCSL statement of recorded samples](https://github.com/sgossner/VCSL). "Water drop" originated from Freesound [#166325](https://freesound.org/s/166325/) by the original Freesound contributor, CC0-1.0 according to [Dewdrop's recording-specific credits](https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md), and was derived from its packaged `drop.wav`. All five permit commercial redistribution; attribution not required under CC0, but retain this table as voluntary credit. CC0 text: https://creativecommons.org/publicdomain/zero/1.0/.

| Cue | Packaged file | Identifiable original | Original SHA256 | Packaged SHA256 |
|---|---|---|---|---|
| soft-bell | `soft_bell.wav` | [source file](https://github.com/sgossner/VCSL/blob/HEAD/Idiophones/Struck%20Idiophones/Hand%20Bells%2C%20Nepalese/HB_2.wav) | `e201ef095eac406a1bd5a9ec774229b57f40407d633e6dbeed53c67ebb973d56` | `dd7375b3fe20fedf995dff34df4f2c0fff7c4aeec13c17f1d0c06b4cb546541a` |
| wood-tap | `wood_tap.wav` | [source file](https://github.com/sgossner/VCSL/blob/HEAD/Idiophones/Struck%20Idiophones/Claves/Legacy/claves_pp1.wav) | `0e6cd83418789c62e53520f6e569a4875ceb57d1fb1e6c87ed113619a13ed64e` | `d06b9daf76f1405c95853f49cf6538758107bd01a694787e6f5a428d408e329e` |
| water-drop | `water_drop.wav` | [source file](https://github.com/Lelio88/dewdrop/blob/HEAD/android/app/src/main/res/raw/drop.wav) | `ebaa9f0bb4b077e7d222048409b770437119e4720648cd79ccd600f125a6cbe8` | `45878b7bb7d37e6f6584a2bd21402df6d3dce753d65503e8a98fe5756510108e` |
| muted-metal | `muted_metal.wav` | [source file](https://github.com/sgossner/VCSL/blob/HEAD/Idiophones/Struck%20Idiophones/Cowbells/Cowbell1_Muted_v2_rr1_Mid.wav) | `efc17778d7cd4468f73b16842beef740fd64e046ce4dccf927c7c1fb230e6ef6` | `9655c3895993f42cf42121082ae2b8479db942975b59d37c806a9c387420703b` |
| two-taps | `two_taps.wav` | [source file](https://github.com/sgossner/VCSL/blob/HEAD/Idiophones/Struck%20Idiophones/Claves/Legacy/claves_mf_2.wav) | `a95a65360741f0f8a75720bc9bc83ee8281c8453193b59def2df9056b969c8ec` | `3e77cb782b2c986a94bed27066cbba94e82eb50730156587412c14ef172b128f` |

Manifest: `android/app/src/main/assets/web/completion_alerts/manifest.json` (canonical hashes and clip durations). Git blob SHA for each file is separately captured in the commit. All sizes are small and no runtime network access is needed.

**Verification**: source Git blobs matched their corresponding downloaded originals. Packaged files were converted from valid RIFF WAV originals, tested structurally as WAV/PCM. Do not infer perceived clarity or Android playback from a file header. Formal `ffprobe`, on-device listening at different volumes/headphones, Android DND/silent and notification-channel tests remain for 00/11 QA.

**Authenticity boundaries:** VCSL's library states instrument recordings; its files are physical hand bell, struck claves and muted cowbell. The water drop is a Freesound recorded drop, not a synthesized "water" ambience. This lane owns only its alert folder; lane 02 nature media remains unchanged.
