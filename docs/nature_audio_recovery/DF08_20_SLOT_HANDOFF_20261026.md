# DF-PARALLEL-08 — 20-slot audio recovery ledger (2026-10-26)

**Status: QUARANTINED, RELEASE_APPROVED=NO.**

This is a safe, non-activating port of the original-source metadata from historic draft #163 at commit `6438feed273f6955b1d4277424f524a8a1ba1be8`. The ledger was built through #59 → #87 → #90 → #163. It is **research evidence**, not release approval or evidence that source bytes reside in the APK.

### Kept and verified as metadata

- `tools/nature_audio/commons_intake.json` holds 20 historical Commons candidates, 14 alternative publisher candidates and exactly 20 selected desired sound slots; each selected source has a unique declared original SHA-256.
- Every candidate is marked `approved_for_runtime=false`, `ready=false`, `human_audio_review=NOT_TESTED`, and `QUARANTINED_NOT_APPROVED`. No candidate has been downloaded into production or made playable.
- Each record retains author, source URL, public rights declaration, source-digest metadata and truthful sound description. These are **claims not independently reverified against byte contents or live source pages in this task**.
- `tests/nature_audio_recovery/quarantined_source_ledger.test.cjs` checks uniqueness, status flags and metadata integrity without needing Android or remote endpoints.

### Existing app vs target

The approved branch currently displays 12 nature tiles, with 10 matching Ogg files under `sounds/`. `night.ogg` and `waterfall.ogg` are missing, and their synthetic fallback cannot be labelled as authentic recordings. `sounds/earth.ogg` and `sounds/noise.ogg` share a Git blob (not two independent sources). Six `audio/*.mp3` assets are a separate catalogue and not automatically approved substitutes.

### Still required before enabling any of 20

1. Check publisher's **individual** rights statement and commercial redistribution permission for each selected file; retain exact original and released SHA256 digests plus author and licence link. Validate originality vs edited derivative if applicable.
2. Obtain and decode each original media file, compare its actual SHA-256 with the ledger, inspect non-music / non-synthesis / correct nature labeling and no duplicate recordings. Listen to each recording and loop seam.
3. Confirm isolated QA APK foreground, background, screen-off and resumed audio in 1, 2, and 20-track cohorts. Historic #90 Android QA documented failed background/screen-off cadence; this has not been fixed by a metadata-only port.
4. Do not change production player wiring, v21 storage, Android Native or the application ID without separate tested approval. A fake `approved_for_runtime=true` field or URL alone must never certify media contents.

**Historical PR disposition:** #17/#26 contain incompletely verified upstream-derived field loops, and #59/#87/#90/#163 contain later quarantine/audit stages. No complete old branch should be merged. The 20-slot metadata is preserved here; #90's real Android lifecycle defects must remain visible until proven resolved.
