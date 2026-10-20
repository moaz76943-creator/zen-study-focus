---
name: deep-focus-audio
description: Audit the real nature-sound catalog, Android playback, completion alerts, offline behavior and enforce per-asset licensing evidence.
---

Read AGENTS.md, the current catalog, media provenance reports and related active PRs. Distinguish verified authentic field recordings from generated tones, duplicate loops, placeholders and missing assets. Every audio file requires traceable source URL, author, exact licence, licence terms permitting commercial redistribution, acquisition date and checksum. CC0 is preferred; CC BY requires correct attribution. Do not treat a successfully decoded Ogg file as proof of provenance, quality or suitability. Test offline media playback, mixer/stop/volume, lifecycle, picker accessibility and fallback state on a real Android target when possible; otherwise label NOT_TESTED. Reject unlicensed replacements; do not change release status or automatically merge.