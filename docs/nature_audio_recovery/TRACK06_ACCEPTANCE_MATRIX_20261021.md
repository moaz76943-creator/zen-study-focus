# TRACK 06 — nature audio 20 and completion alerts: evidence and acceptance matrix

**Audit snapshot:** 2026-10-21 · **source integration candidate:** PR #138 `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5` · **media owner:** PR #90 `f55573b1180635ab84e129bdbaf9e5fa925c0dbd` · **approval:** `RELEASE_APPROVED=NO`.

**This is a non-activating evidence handoff, not a playback fix or licence clearance.** No production player, app data, Android package/permissions, manifest, source recordings, existing QA flags, or `main` are changed by this audit. Exact-head source/runtime verification of PR #138 is **NOT_TESTED** in this audit; successful older checkouts are explicitly historical.

## Source identity and status

The canonical `tools/nature_audio/commons_intake.json` has 20 distinct requested slots and 20 distinct pinned original SHA256 digests (declarations: 14 CC0-1.0 and 6 PD-author). One slot maps to one selected source: a historic Commons entry is **not** confused with its later `requested_*` replacement. All 20 selected entries explicitly set `approved_for_runtime=false`, have `human_audio_review=NOT_TESTED`, and none has `ready=true`. Where an older Commons entry omits `ready`, it must remain *effectively unavailable*, not silently rewritten to `true`. Source-license metadata and hashes are documentary/CI assertions, **not human commercial-rights approval**.

| # | Requested slot / recording | Declared author, rights and upstream source | Pinned ORIGINAL SHA256 | Technical evidence | Final approval |
|---|---|---|---|---|---|
| 1 | `ocean` · Atlantic ocean waves | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/sea-waves-s0698.html)) | `5d8c2c1fc7d284bf59d2d933fa07ec7047ed63c87dd1a91f71742566a26d9ba1` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 2 | `rain` · Summer rainfall on terrace | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/summer-rain-on-terrace-s1019.html)) | `1b8a6e268549d7957862707bd1b73ac7ee5b1376e9ee2c70e65d2085d947642d` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 3 | `fire` · Crackling fireplace | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/fireplace-5-s2857.html)) | `d0c01e35e435b4008a206336af8dbf691c1fecece4645013ab6a8379b50ebe1b` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 4 | `forest` · Forest birds and wind | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/forest-4-s2749.html)) | `893ade56fc3046ba1dc27860b6489794542d5acc09aefc039e4030c187e18b31` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 5 | `stream` · Woodland creek | Dsw4 · PD-author ([source](https://commons.wikimedia.org/wiki/File:Forest_lawn_creek.ogg)) | `11d0a515c2eb636a6492cf5571a7f6898f892feb11752e82a384a6f75c492f70` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 6 | `leaves` · Wind in trees with branch creaks | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/wind-and-tree-squeaks-s1051.html)) | `64b7fc3a96337abebe8ee514369cfff5f78e355bd112cc89117355c3ac07f33c` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 7 | `waterfall` · Small waterfall near a mill | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/small-cascade-s0507.html)) | `81e40ec1ae78f3237d053b20632fb3ff087a110554961b87e8b9f20f67c868f2` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 8 | `night` · Night peeper frogs | JohnDziak · CC0-1.0 ([source](https://commons.wikimedia.org/wiki/File:Spring_Peeper_Frogs_(Pseudacris_crucifer)_singing_on_night_of_April_21_of_2019_in_North_Pittston_PA.ogg)) | `9580b1eb15f953ff3746c1849e2c731217461a1249d6e1e2ac91231a3bb37eaf` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 9 | `thunder` · Rain and thunderstorm | ezwa · PD-author ([source](https://commons.wikimedia.org/wiki/File:Rain_and_thunder_(1).ogg)) | `28bf32d934067dd8656062bacec2a69db49f9e15fb0e63b3ffe53c51a6b8c8eb` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 10 | `wind` · Natural wind gusts | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/strong-wind-4-s0154.html)) | `5ab2ece1cbef4a05f8741a5fa146f0d6e54d6fc53d78aa2ca32664fd00e1b9ff` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 11 | `winrain` · Rain on window | cori · PD-author ([source](https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg)) | `85be295e9936fbf003ae5dbc0e106b77e60854ea4b19bfb7b232420f291a737e` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 12 | `rain_soft` · Light rain at dusk | SamuelGremaud · CC0-1.0 ([source](https://freesound.org/people/SamuelGremaud/sounds/544342/)) | `0daa5050d8be0ce5952e14c8dd59b714cde10a3c52639863b5f91f6ba0f0b454` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 13 | `rain_downpour` · Heavy rainfall | ezwa · PD-author ([source](https://commons.wikimedia.org/wiki/File:Rain_(1).ogg)) | `31efcbe952a3989a9276774e2d7be61a2dc98fdd785a94d1435fc19cda9a84d1` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 14 | `waves_calm` · Small waves on the beach | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/small-waves-and-beach-1-s1446.html)) | `e1149a1473c7ffb827f95bb78fb139d66ce9d39e49edbe0dfef411197fb256f8` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 15 | `birds_dawn` · Early-morning birds | jc · PD-author ([source](https://commons.wikimedia.org/wiki/File:Bird_singing.ogg)) | `ed1286d29b1ab6cc85e099861d1f8405dda7865df4d2ceb0cb1e946cd30900bd` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 16 | `fire_hearth` · Open-hearth fireplace | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/fireplace-2-s0031.html)) | `fd67a63655e75ccdc476353916b0103b8331b58964599506854a7a67672d34b5` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 17 | `stream_brook` · Small brook | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/brooklet-s0864.html)) | `798da985c253ae63209375b450f4174c79834769c59f8d21f74ed853d4732dea` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 18 | `night_crickets` · Night field crickets and distant frogs | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/campaign-at-night-4-s1880.html)) | `f3fcee806cdcaed36074341f969059ba3db2385362cb3303bb99237a3d2276d6` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 19 | `meadow` · Rural field birds and crickets | Joseph SARDIN · CC0-1.0 ([source](https://bigsoundbank.com/countryside-3-s1911.html)) | `0674f5cd57a824ecdf4d684a74fc7972d356dbeee6afe4c7bf5fa25e1e43b1ac` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |
| 20 | `coastal_wind` · Wind in coastal Fisterra | Escoitar.org · PD-author ([source](https://commons.wikimedia.org/wiki/File:Vento_fisterra.ogg)) | `7ea1fd527488b5cfada8545e6acaf73c22a9432a94eec94157e1c76d01e4ccdf` | CI historical PASS¹ / Android loop PASS² | Rights PENDING; human/phone NOT_TESTED |

¹ Historical CI for PR #90 at its exact SHA verified source/rights-page assertions, twenty unique original bytes, full Vorbis decode and derived loops. The source/QA run [39554574132](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39554574132) passed its source/browser job. SHA pins above are from the PR #138 manifest; a new live, independent upstream-rights recheck at PR #138 HEAD is **NOT_TESTED**. Declared `contains_music=false` is not an audition.

² The same run's Android API 30 isolated AudioQA check passed 20 originals, 20 loop wraps, and 42 ADB controls **before failing lifecycle**. This demonstrates muted / test-mode decoded control operations only; it does *not* verify audibility, crossfade seam quality, headphone output or commercial rights. Native QA app is `com.zenstudy.focus.audioqa`, not the product app. In-product per-candidate playback remains unavailable.

Per-file manual criteria still **NOT_TESTED**: authentic field context and no music/speech; noise/hiss/peaks/clipping; label accuracy; audible loop/crossfade; acceptable 30-minute listening; RTL/LTR and native-speaker review of the selected recording name in 20 locales; original-vs-derivative SHA linkage on the intended final release artifact; and sound-by-sound rights signoff. Note known warnings: historic `Ocean_Waves_on_a_Tropical_Beach.ogg` has conflicting embedded music-origin metadata and is excluded from selected QA; historical `earth.ogg`/`noise.ogg` are duplicate non-nature hum; the newly selected Freesound rain source is a disclosed lower-bitrate official preview; existing `winrain` maps to **window rain**, not a roof claim. Do not transfer historic approval to replacement files.

## Known blocking Android failure — AUDIO-BG-UNDERRUN-01

**Actual run:** [39554574132](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39554574132), Android job ID `119074465060`, API 30 emulator with WebView 83.0.4103.106, tested PR #90 SHA `f55573b1180635ab84e129bdbaf9e5fa925c0dbd`.

| Scope / 18-second unmuted comparison | Foreground | Background (HOME) | Screen off (POWER) |
|---|---|---|---|
| 2 tracks | PASS | **FAIL** | **FAIL** |
| 20 tracks | PASS | **FAIL** | **FAIL** |

The test recorded playback-time progress around 15.19–15.69 seconds in about 18.02–18.03 seconds for hidden phases, versus approximately 18.01–18.04 seconds in visible phases. The existing strict tolerance (elapsed time minus 1.5s) must **not** be relaxed. Observed AudioFlinger client underruns increased in hidden phases; the cause remains undetermined and cannot be assigned solely to WebView or the emulator. The failure is on the isolated AudioQA route, **not yet shown to affect both existing product sounds**.

**Exact Android job-log failure excerpt** (not invented device output; complete raw logs and `media.audio_flinger` diagnostics belong to the original run/artifacts):

```text
AUDIO20_REALTIME_FAIL 2 background AssertionError [ERR_ASSERTION]: Playback stalled during lifecycle observation
AUDIO20_REALTIME_FAIL 2 screenOff AssertionError [ERR_ASSERTION]: Playback stalled during lifecycle observation
AUDIO20_REALTIME_FAIL 20 background AssertionError [ERR_ASSERTION]: Playback stalled during lifecycle observation
AUDIO20_REALTIME_FAIL 20 screenOff AssertionError [ERR_ASSERTION]: Playback stalled during lifecycle observation
AUDIO20_WEBVIEW_FAIL: AssertionError [ERR_ASSERTION]: Playback stalled during lifecycle observation
```

**Evidence:** [actual Android APK, JSON, traces and log artifact 12326160507](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39554574132/artifacts/12326160507); [original/loop review bundle 12325925264](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39554574132/artifacts/12325925264). APK SHA256: `84a52740ddefcf06566f6804ab9321c01ce903645dc6380faaafb84bed0b80c6`. Artifact expiry may require rerunning the isolated QA job; links are not a promise of perpetual retention. Independent older 1802-second foreground muted mix PASS at `61725a4...` belongs **only to that older commit**. Latest-head 1800-second endurance is **NOT_TESTED**, not a pass.

**Smallest safe diagnostic continuation:** capture the same before/after `currentTime`, `visibilityState`, wakefulness, active-track count, duration and native AudioFlinger counters for (a) the two currently allowed product tracks and (b) 2/20 isolated AudioQA tracks on equivalent *modern* WebView/Android hardware. Distinguish frame/scheduler timestamp throttling from actual underflow, capture `dumpsys media.audio_flinger` pre/post **each** phase, and require all four hidden-state comparisons and 1800-second endurance on the tested final SHA. No speculative wakelock, foreground-service, permission or production mixer changes before owner review of PR #138.

## Completion alerts — already present, do not duplicate

The existing `completion_alert_settings.js` lists **six choices: silent + five recorded non-melodic cues**. The canonical `android/app/src/main/assets/web/completion_alerts/manifest.json` has five unique packaged SHA256 values and WAV/PCM16 mono/44100 format. Source register: [docs/ALERT_AUDIO_LICENSES.md](https://github.com/moaz76943-creator/zen-study-focus/blob/cd1713b66fdf6ec11c5808834bf30f516ee8f6c5/docs/ALERT_AUDIO_LICENSES.md).

| # | Cue / packaged asset | Declared origin/licence | Packaged SHA256 | Result |
|---|---|---|---|---|
| 0 | `silent` (no file) | N/A; intentional silence | N/A | Source-only behavior PASS³; device NOT_TESTED |
| 1 | `soft-bell` · `soft_bell.wav` | Versilian VCSL CC0-1.0 | `dd7375b3fe20fedf995dff34df4f2c0fff7c4aeec13c17f1d0c06b4cb546541a` | WAV structural PASS³; phone/DND NOT_TESTED |
| 2 | `wood-tap` · `wood_tap.wav` | Versilian VCSL CC0-1.0 | `d06b9daf76f1405c95853f49cf6538758107bd01a694787e6f5a428d408e329e` | WAV structural PASS³; phone/DND NOT_TESTED |
| 3 | `water-drop` · `water_drop.wav` | Dewdrop/Freesound CC0-1.0 | `45878b7bb7d37e6f6584a2bd21402df6d3dce753d65503e8a98fe5756510108e` | WAV structural PASS³; phone/DND NOT_TESTED |
| 4 | `muted-metal` · `muted_metal.wav` | Versilian VCSL CC0-1.0 | `9655c3895993f42cf42121082ae2b8479db942975b59d37c806a9c387420703b` | WAV structural PASS³; phone/DND NOT_TESTED |
| 5 | `two-taps` · `two_taps.wav` | Versilian VCSL CC0-1.0 | `3e77cb782b2c986a94bed27066cbba94e82eb50730156587412c14ef172b128f` | WAV structural PASS³; phone/DND NOT_TESTED |

³ Existing `tests/completion_alerts/*.test.cjs` verifies WAV headers/hash, picker strings in 20 languages, selection persistence, bounded completion-ID dedupe, mute/zero volume, failed persistence and failed playback. These are **existing source checks**, not newly executed on the PR #138 SHA. Physical audibility, licence adjudication, native channel behavior and 20-locale human translation accuracy remain **NOT_TESTED**. Structural match of a source hash is not a listening verdict.

**Specific integration risks:** `FocusTimerService.java` already has a native session-token gate, a visual-only completion channel and separate background MediaPlayer; foreground JS has its own bounded completion ledger. Verify exactly one perceived cue and one visual notification across service/WebView handoff, restart, rapid retry and missed callbacks. Confirm Android notification-channel persistence from earlier installations, DND/zen mode, silent mode, denied notifications, Bluetooth/headset, transient/permanent Audio Focus loss and media player release. Native notification text currently contains fixed English strings: translation behavior in the 20 app locales is **not proven**, and full locale QA is not satisfied merely by picker key parity.

## PASS / FAIL / NOT_TESTED — acceptance register

| Gate | Status at PR #90 evidence | Status for PR #138 exact-head approval |
|---|---|---|
| 20 distinct selected original SHA pins | PASS (manifest/CI) | Static inspection PASS; live recheck NOT_TESTED |
| Original Ogg full decode and 20 loop wraps | PASS (historical isolated QA) | NOT_TESTED |
| Android 2/20 foreground bounded playback progress | PASS (historical isolated QA) | NOT_TESTED |
| Android 2/20 background and screen-off progress | **FAIL**, AUDIO-BG-UNDERRUN-01 | **BLOCKED**; no passing retest |
| Independent 30-minute current-head endurance | NOT_TESTED | NOT_TESTED |
| 1/2/20 streams + volume/master/stop | Historical UI and 2/20 QA evidence; 1 stream not isolated as an independent current-head gate | NOT_TESTED |
| Crossfade seamless **audible** loop and no music/voices | NOT_TESTED | NOT_TESTED |
| Android real-device speaker/Bluetooth/headset/audio focus/DND | NOT_TESTED | NOT_TESTED |
| Twenty-language labels (source key/layout coverage) | PASS for PR #90 focused tests, human review NOT_TESTED | NOT_TESTED |
| Five recorded CC0 alert assets + silence | PASS source-level historical tests, human/Android NOT_TESTED | NOT_TESTED |
| Native alert once per session including background and DND | Source mechanisms present; end-to-end NOT_TESTED | NOT_TESTED |
| Independent per-file rights and human acceptance | **0/20 approved** | **0/20 approved** |
| Production activation / release | NO | **RELEASE_APPROVED=NO** |

**Decision:** retain the source of truth in the existing manifest and leave every unapproved candidate unavailable. This PR is an audit snapshot only. Next code change belongs to the audio/Android specialist after controlled reproduction and coordination with PR #90 and PR #138, not to this evidence PR.
