# Deep Focus — bundled-media provenance (v21 recovery)

All audio shipped to Google Play must have an actual media header, an appropriate licence, and a source record. Merely giving an HTML error page an `.ogg` extension is not sufficient.

| Local asset | Source | Licensing evidence | Status |
| --- | --- | --- | --- |
| `sounds/forest.ogg` | `Lelio88/dewdrop/assets/audio/forest_amb.ogg` | [Dewdrop CREDITS.md](https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md), ambient CC0 / public-domain policy | Replaced invalid 404 asset, Ogg header verified |
| `sounds/wind.ogg` | `Lelio88/dewdrop/assets/audio/fields_amb.ogg` | Dewdrop credits: field wind recording from Freesound #240914 by bdvictor, CC0 | Replaced invalid 404 asset, Ogg header verified |
| `images/fire.svg` | In-repository SVG illustration created for this repair | Project-created graphic | Offline replacement for invalid fire.jpg |
| `sounds/night.ogg` | Former v21 placeholder | Removed invalid HTML 404; locally synthesized insect-night texture used until authentic licensed recording is sourced | **BLOCKED for real-recording release claim** |
| `sounds/waterfall.ogg` | Former v21 placeholder | Removed invalid HTML 404; locally synthesized waterfall-like texture used until authentic licensed recording is sourced | **BLOCKED for real-recording release claim** |

The rest of the pre-existing recordings have not undergone a per-file licence provenance audit yet. Do not describe them collectively as CC0 without source evidence. A complete media audit and a separate listening/looping check are release prerequisites.

The night/crickets and waterfall recording replacements must be authentic, appropriately licensed, playable offline, and verified before merging this repair. No unrelated audio is to be relabeled to conceal missing recordings.

## 2026-10-19 playback safety correction
The app's active catalogue now only offers packaged Ogg files. Waterfall and Night do not exist in the current assets tree and are not exposed; Earth is an ambient air-conditioner hum, not a natural recording, and is also excluded. The Web Audio generated-noise fallback is removed entirely: a load/decode failure stops playback with an explicit error rather than silently playing imitation nature audio. No remote-streaming fallback or renamed placeholder was added. This change is **not** a fidelity or per-file licence attestation for the remaining recordings; conduct listening/loop/bitrate and original source licence reviews before promoting a release. User data and legacy IDs are unchanged.

### Verified container metadata (2026-10-19)
Ogg container pages and each codec identification packet were inspected, using **the declared sample rate**, not an assumed 48 kHz. Forest and wind are genuine Vorbis-encoded recordings at 192,000 Hz, approximately 34 seconds per recording, 88.7 and 91.2 kbit/s mean data rates respectively. These container figures do **not** prove perceptual fidelity or source authenticity; both remain selectable pending a real listening and provenance review. Thunder is a short 8.81-second Ogg/Opus recording, about 54.8 kbit/s; it now plays once on selection rather than looping every 8.8 seconds. Stream is approximately 78.61 seconds of Ogg/Opus at 62.5 kbit/s. The current playable catalogue contains nine recordings. The missing waterfall/night and mislabeled air-conditioner hum remain unavailable. Licensing and listening approval are still release blockers.
