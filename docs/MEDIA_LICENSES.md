# ZEN FOCUS — bundled-media provenance (v21 recovery)

All audio shipped to Google Play must have an actual media header, an appropriate licence, and a source record. Merely giving an HTML error page an `.ogg` extension is not sufficient.

| Local asset | Source | Licensing evidence | Status |
| --- | --- | --- | --- |
| `sounds/forest.ogg` | `Lelio88/dewdrop/assets/audio/forest_amb.ogg` | [Dewdrop CREDITS.md](https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md), ambient CC0 / public-domain policy | Replaced invalid 404 asset, Ogg header verified |
| `sounds/wind.ogg` | `Lelio88/dewdrop/assets/audio/fields_amb.ogg` | Dewdrop credits: field wind recording from Freesound #240914 by bdvictor, CC0 | Replaced invalid 404 asset, Ogg header verified |
| `images/fire.svg` | In-repository SVG illustration created for this repair | Project-created graphic | Offline replacement for invalid fire.jpg |
| `sounds/night.ogg` | Existing v21 placeholder | No valid file available | **BLOCKED** — HTML 404 |
| `sounds/waterfall.ogg` | Existing v21 placeholder | No valid file available | **BLOCKED** — HTML 404 |

The rest of the pre-existing recordings have not undergone a per-file licence provenance audit yet. Do not describe them collectively as CC0 without source evidence. A complete media audit and a separate listening/looping check are release prerequisites.

The night/crickets and waterfall recording replacements must be authentic, appropriately licensed, playable offline, and verified before merging this repair. No unrelated audio is to be relabeled to conceal missing recordings.
