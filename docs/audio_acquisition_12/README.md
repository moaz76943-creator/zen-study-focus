# RECOVERY-12 — authentic nature-audio quarantine (19 Oct 2026)

## Isolation and provenance

Scope: separate candidate blobs in audio_candidates/recovery12/, read-only audit/tests and independent CI workflow. No Central Player, Gemini files, Android assets, app.js, index.html, or PR #25 shared code were edited.
Starting point: PR #25 head 0dd9239bc28978e11f41c1c0f618c9662b291fe2. The nine investigated recordings were exact Git-blobs previously acquired by PR #17 from euuuuuuan/todak-public; only the three with independently verified original license pages are physically retained here; no claim to have downloaded their original Freesound WAVs. The upstream CREDITS.md separates 13 field-derived recordings from 15 synthesised ambiences. ONLY three field-derived files with individually checked original CC0 pages are quarantined here, unmodified from PR #17; six legally unresolved binaries are not included in this PR. These are upstream-created *30-second re-cut and EQ loops*, not unprocessed field recordings.

## Per-file decision — original source rights versus derivative identity

| Binary candidate | Original attribution / ID | Independent Freesound source licence | Decision |
|---|---|---|---|
| rain_soft.ogg | joedeshon #430765 | CC0 1.0 directly observed | Original CC0 page confirmed; **derived file still BLOCKED** |
| fire_hearth.ogg | uniuniversal #620007 | CC0 1.0 directly observed | Original CC0 page confirmed; **derived file still BLOCKED** |
| birds_dawn.ogg | Resaural #634511 | CC0 1.0 directly observed | Original CC0 page confirmed; **derived file still BLOCKED** |
| rain_downpour.ogg | bajko #378052 | upstream CREDITS only | REJECT — original licence not independently confirmed |
| stream_brook.ogg | cher1101 #671883 | upstream CREDITS only | REJECT — original licence not independently confirmed |
| waves_calm.ogg | profispiesser #543819 | upstream CREDITS only | REJECT — original licence not independently confirmed |
| cafe.ogg | arpeggio1980 #437461 | upstream CREDITS only | REJECT — licence and possible voices/privacy pending |
| storm_far.ogg | nickmaysoundmusic #513251 | author profile says public domain, not per-file page | REJECT — per-file licence pending |
| night_crickets.ogg | felixblume #479041 per upstream | source username differs from known felix.blume profile; no direct sound page | REJECT — identity mismatch, licence unknown |

Upstream copied Ogg hashes, actual Git blob IDs, direct Freesound URLs, claims, author, verification flags, and acquisition date are in audio_candidates/recovery12/manifest.json. Every original_sha256 is null: the original WAV bytes and proof of exact transformation to the shipped Ogg have **not** been obtained. All release approval flags remain false. The direct CC0 licence allows copying, modification and commercial redistribution of a genuinely CC0 original; it does not establish that any claimed derivative genuinely originates from that original.

Freesound direct-page evidence for the three original rights checks:
- https://freesound.org/people/joedeshon/sounds/430765/
- https://freesound.org/people/uniuniversal/sounds/620007/
- https://beta.freesound.org/people/Resaural/sounds/634511/

## Additional authentic alternatives researched, not downloaded

- Waterfall: https://freesound.org/people/Tom_Kaszuba/sounds/660255/ — author Tom_Kaszuba, true waterfall field recording, CC0 original page confirmed. Original WAV download prompts for login; no original SHA and NO bytes added.
- Night crickets: https://freesound.org/people/Vrymaa/sounds/805466/ — described in Recovery 02 research, original source download and SHA not obtained.
- Wikimedia Commons File:Water fall.ogg by Benzband is a real short waterfall recording under CC BY-SA 3.0, not automatically cleared under this intake's CC0 / CC BY preference. File:Waterfall.ogg is narration of an encyclopedia article and must never be mistaken for waterfall ambience.
- Leaves, soft wind, forest, rooftop rain and extra source recordings: none acquired or independently licensed in this lane.

## Automated objective evidence

Command: node --test tests/audio_acquisition_12/*.test.cjs
Command: node tests/audio_acquisition_12/audit_candidates.cjs --integrity
Command: node tests/audio_acquisition_12/audit_candidates.cjs --release (MUST fail until explicit human/Android approval).

The standalone audit recomputes every byte SHA256, rejects HTML/error files and missing/short/non-Ogg files, confirms ffprobe codec/duration/sample rate/channels, decodes complete audio with ffmpeg, and reports RMS dBFS, sample peak dBFS, clipping, large sample jumps, and 30s loop-edge discontinuity. These are **screening diagnostics**, not a substitute for subjective listening, true-peak oversampling or tested seamless looping. Results are written locally to audio_candidates/recovery12/qa_report.json and uploaded as a CI artifact from the dedicated recovery12 workflow. No transcode, gain normalization or synthetic sound is created.

Not performed: actual phone listening (quality/volume/fatigue), Android WebView decoder/airplane-mode, complete loop audition for >30 minutes, original Freesound WAV acquisition, original WAV SHA256, independent derivation proof. Do NOT infer any of these from ffprobe.

## Safe integration handoff — owned by RECOVERY-00 only

1. Clear licence+original author individually; resolve crickets' username, maintain CC BY attribution if any replacement uses CC BY. For each binary obtain original WAV and its SHA256 and evidence connecting it to any derivative, or record why independently verifiable equivalence is established. Reject all unclear cases.
2. Inspect CI measurement artefact; manually listen on actual Android at study levels, headphones and speaker; 30+ minute loop, 0% volume, mixed peaks, offline mode and pause/resume. Do not label a raw file 'quality approved' before these tests.
3. Have lane 00 copy approved candidates from quarantine to authoritative Android asset path, update the authoritative licence/attribution ledger and runtime mapping in its OWN shared files only. Keep original nine candidates excluded from APK until then.
4. Rerun existing strict tests/nature_audio_recovery/audit_media.cjs gate and exact-SHA Android debug/unsigned bundle, verify sizes and all language/runtime checks, require human PR review. No direct main merge, no Gemini changes, no release signing.

## Measured CI evidence — real audio bytes, not simulated

GitHub Actions run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39226331499
Audited exact SHA: c4b6b2fe4d18853d7f1079cdb7a2b427f7d5747b
Machine-readable 9-record report: docs/audio_acquisition_12/QA_EVIDENCE_20261019.json

| Ogg recording (all 30 seconds / Vorbis) | Peak dBFS | RMS dBFS | Sudden PCM jumps >0.6 | Clipped samples |
|---|---:|---:|---:|---:|
| night_crickets | -11.85 | -27.12 | 0 | 0 |
| rain_soft | -13.68 | -27.28 | 0 | 0 |
| rain_downpour | -3.13 | -26.32 | 0 | 0 |
| fire_hearth | -1.15 | -26.97 | 30 | 0 |
| stream_brook | -1.52 | -26.97 | 69 | 0 |
| waves_calm | -5.42 | -26.38 | 0 | 0 |
| birds_dawn | -13.27 | -26.21 | 0 | 0 |
| cafe | -6.64 | -26.32 | 0 | 0 |
| storm_far | -8.78 | -26.15 | 0 | 0 |

Objective outcome: 9/9 hashes match, ffprobe and full ffmpeg decoding succeeded, 0 sample clipping across all clips, no high sample-jump flags in 7 of 9. **Fire_hearth and stream_brook require targeted human listening** for transients; a distant wood crackle and splashing are plausible natural causes, not proven defects. These are sample peak measurements after mono 16 kHz downmix, not oversampled true peaks or Android/WebView decoding. A 30-second repeated loop may cause listening fatigue even if edge discontinuity is small.

### Provisional long-study shortlist (not a listening verdict)

Given recording category, low measured peak and no detected abrupt jumps, rain_soft is the best **candidate for human evaluation**, followed by waves_calm. Birds_dawn is a possible alternative for shorter sessions, but birds can draw attention. Defer fire_hearth, stream_brook, thunder/storm, café and crickets pending human fatigue, privacy and/or rights checks; quiet metrics alone do not certify content quality.

All nine remain unapproved, no runtime integration, no APK size effect. Full report and human rights review must be completed before activation.

## Final legal quarantine disposition

**Physical files in this PR: 3 only**, rain_soft.ogg, fire_hearth.ogg, birds_dawn.ogg. Their original Freesound pages individually state CC0, but the Ogg derivative attribution chain and Android playback are not yet proven. **Six other clips are rejected as media for this branch** and retained as metadata in manifest.rejected_files only: night_crickets, rain_downpour, stream_brook, waves_calm, cafe and storm_far. The nine-file forensic measurements above were taken at the earlier audited SHA c4b6b2fe before removing rejected binaries; their evidence JSON is retained for decision traceability, not redistributed audio. The current branch's CI rechecks only the three retained binaries.
