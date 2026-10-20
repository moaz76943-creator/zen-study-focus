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

## Current consolidated inventory clarification (master completion)

The table above records historical recovery claims, not final recording approval. In the current tree `night.ogg` and `waterfall.ogg` are **absent**, and no synthesized replacement is shipped for them. The live library retains only its existing forest/wind allowlist; their secondary credits do not establish an original-to-bundled hash chain or Android/human listening clearance. No newly approved nature recording was added by this completion branch.

`python3 tools/recovery/media_inventory.py --out REPORT.json` enumerates all 12 catalog identities plus auxiliary Oggs, records actual bundled SHA256, size, codec, channels, sample rate, duration and full desktop decode. Current inventory: 14 identities inspected, 12 packaged Oggs, 2 missing catalog assets (night/waterfall); cafe/noise are auxiliary and not selectable. Earth and noise remain byte-identical; earth must not be labeled as a nature recording. Unknown original hashes, authors, acquisition dates and rights remain null; no invented provenance or perceptual approval.

Three candidates from PR26 remain quarantined outside Android assets. Their original-chain proof, normal-volume listening and Android playback are still required. The explicit media release gate stays failing. See exact-SHA inventory and quarantine reports in the test-build evidence artifact; a codec/decode PASS is **not** a license, authenticity, distortion, loop, listening or Android PASS.
