# DF08 — Completion-alert media source port (2026-10-26)

Source: historical PR #24, exact audio/media object IDs copied **unchanged** by Git-tree SHA in the same repository. Five WAV PCM files, `completion_alert_settings.js`, original manifest and original source-licence record are staged.

## Rights
Four hand-performed instrument cues originate from the Versilian Community Sample Library, whose publisher explicitly permits **commercial use of its CC0 samples**:
https://versilian-studios.com/vcsl/ .
The water-drop cue derives from `Lelio88/dewdrop`'s CC0 Freesound #166325 recording. Project credits:
https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md .

The per-clip original SHA256, packaged SHA256 and origin paths are retained in `docs/ALERT_AUDIO_LICENSES.md` and `completion_alerts/manifest.json`. A dedicated GitHub workflow checks actual bytes against the manifest and decodes each packaged WAV using FFmpeg. Merely having a hash or a URL does not replace a sound audition on devices.

## Deliberate integration boundary

- **Not connected to `app.js`, `index.html`, Android native FocusTimerService, or user v21 persistence.** Old synthetic completion tones remain in the main application; we are not silently swapping the sound implementation.
- The independent JS engine's persistence entrypoint is injected by the future integrator and is **not called** in production just by bundling this unused module.
- No Nature Library recordings are approved through this port.
- Real alert timer callback arbitration, Android OS notification channel/DND and screen-off behavior, multiple user devices, headphones/Bluetooth and human listening **NOT_TESTED**. These are separate from code/media source checks.
- Release approval remains NO. Do not claim 5 cues work in the application until wiring and actual WebView/API30/API35 checks pass.

Port goal: remove duplicate ancient branches without discarding source bytes and legal evidence, while keeping real Android acceptance work explicitly visible.
