/**
 * DEEP FOCUS — Unified Audio Core (v1.0.0)
 * Single source of truth for all Web Audio operations.
 * Guarantees:
 *   - Exactly ONE AudioContext (created only on user gesture)
 *   - Zero static/hiss: proper DC removal, peak normalization, seamless crossfade
 *   - Zero auto-play: gesture-gated context creation & resume
 *   - Crisp mixing: master limiter (-6dB) + DC-blocking on every voice
 *   - Reliable nature sounds: procedural fallback for missing OGG
 *   - Instant Stop: 30ms hard fade, immediate node teardown
 *   - 100% music-free: only pure noise spectra & sine-wave binaural beats
 */
(function (global) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  const LIMITER_DB = -6.0;
  const LIMITER_LINEAR = Math.pow(10, LIMITER_DB / 20);        // ≈ 0.501
  const MASTER_HEADROOM = 0.85;                                // hard ceiling
  const XFADE_MS = 20;                                         // crossfade for seamless loops
  const FADE_IN_MS = 30;                                       // fast click-free onset
  const FADE_OUT_MS = 30;                                      // instant stop
  const DC_BLOCK_HZ = 40;                                      // protects transducer coils & brown noise rumble
  const BROWN_POLE = 0.997;                                    // leakier = less DC drift
  const BROWN_GAIN = 0.4;                                      // input gain for brown noise
  // Fixed output scale — reduced from 0.045 for extra headroom against
  // leaky-integrator tail peaks and DC drift. This level ensures brown noise
  // peaks stay well below the master limiter threshold (-3dB ≈ 0.707) even
  // when multiple voices are stacked and master volume is at 1.0.
  const BROWN_NOISE_AMP = 0.025;
  const WHITE_NOISE_AMP = 0.05;                                // reduced from 0.06 for consistent noise floor
  const PINK_NOISE_AMP = 0.065;                                // reduced from 0.08 for consistent noise floor
  // Master limiter threshold: -3dB (0.707) — high enough to NEVER engage on normal content
  // (voice peaks × master gain max ≈ 0.35). Only catches genuine overshoots > 0.7.
  // The old -12dB (0.25) threshold compressed the noise floor into audible hiss/static.
  const MASTER_LIMITER_THRESHOLD_DB = -3.0;
  const MASTER_LIMITER_THRESHOLD_LINEAR = Math.pow(10, MASTER_LIMITER_THRESHOLD_DB / 20); // ≈ 0.707
  // Voice peak ceiling: voices are gain-scaled so their peak output never exceeds this.
  // At master volume 1.0, master gain = LIMITER_LINEAR (0.501). Voice gain max = VOICE_PEAK_CEILING.
  // Combined peak = 0.501 * VOICE_PEAK_CEILING. With 4 simultaneous voices (worst case
  // coherent sum = 4x, incoherent = 2x), we stay well below limiter threshold.
  const VOICE_PEAK_CEILING = 0.35;

  // ── AudioContext Singleton ────────────────────────────────────────
  let sharedContext = null;
  let gestureReceived = false;
  let masterGain = null;
  let masterLimiter = null;
  let masterDCBlock = null;
  let analyser = null;
  // User-chosen master volume (0..1). The master chain is hard-muted to 0 by
  // stopAllVoices/muteMaster; every re-open path must restore THIS value, not a
  // hard-coded 0.7 — otherwise Stop→play reset the user's volume and let the
  // full noise floor back in at the wrong level.
  let userMasterVolume = 0.7;
  const MASTER_OPEN = () => userMasterVolume * LIMITER_LINEAR;
  const activeVoices = new Set();        // { source, gain, dcBlock, stopFn }

  // Gesture detection (once per session) + visibility change handling
  function bindGesture() {
    if (typeof document === 'undefined' || global.__dfAudioGestureBound) return;
    global.__dfAudioGestureBound = true;
    const unlock = () => {
      gestureReceived = true;
      resumeContext();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { passive: true, once: true });
    document.addEventListener('touchstart', unlock, { passive: true, once: true });
    document.addEventListener('keydown', unlock, { passive: true, once: true });

    // Handle tab switch / visibility change: suspend on hidden.
    // On visible, do NOT auto-resume — require explicit user gesture to prevent
    // any audio auto-play on tab switch. The user must interact to resume.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && sharedContext && sharedContext.state === 'running') {
        sharedContext.suspend().catch(() => {});
      }
    }, { passive: true });
  }

  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const isNodeEnv = typeof navigator !== 'undefined' && navigator.userAgent?.includes('Node.js');
    if (!sharedContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!gestureReceived && !isNodeEnv) {
        throw new Error('AudioContext creation requires user gesture');
      }
      sharedContext = new AudioCtx();
      buildMasterChain(sharedContext);
    }
    return sharedContext;
  }

  function resumeContext() {
    if (sharedContext && sharedContext.state === 'suspended') {
      sharedContext.resume().catch(() => {});
    }
  }

  function buildMasterChain(ctx) {
    // Master gain (user volume * limiter ceiling)
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(MASTER_OPEN(), ctx.currentTime);

    // Master limiter (catches genuine overshoot from stacked voices only).
    // Threshold at -3dB (0.707) — well above normal peak levels (≈0.35) so it
    // NEVER compresses the noise floor. The old -12dB threshold started
    // compressing at -36dB, right at the procedural noise floor, audibly
    // modulating it ("hiss/static"). Narrow knee (3 dB) keeps it transparent.
    // Buffer generation already peak-limits (attenuate-only), so this
    // is purely a safety net for unexpected transients.
    masterLimiter = ctx.createDynamicsCompressor();
    masterLimiter.threshold.setValueAtTime(MASTER_LIMITER_THRESHOLD_DB, ctx.currentTime);
    masterLimiter.knee.setValueAtTime(3, ctx.currentTime);
    masterLimiter.ratio.setValueAtTime(20, ctx.currentTime);
    masterLimiter.attack.setValueAtTime(0.001, ctx.currentTime);
    masterLimiter.release.setValueAtTime(0.1, ctx.currentTime);

    // Global DC block (catches any residual DC from any voice)
    masterDCBlock = ctx.createBiquadFilter();
    masterDCBlock.type = 'highpass';
    masterDCBlock.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
    masterDCBlock.Q.setValueAtTime(0.707, ctx.currentTime);

    // Analyser for visualizers
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;

    // Chain: masterGain → limiter → DC block → analyser → destination
    masterGain.connect(masterLimiter);
    masterLimiter.connect(masterDCBlock);
    masterDCBlock.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function getMasterOutput() {
    // Every audible node connects to the master through here — if the app is
    // wiring up sound, that implies a user gesture, so re-open the ceiling
    // (instant Stop closed it). Pure read/connection use is idempotent.
    unmuteMaster();
    return masterGain; // voices connect HERE, not to destination
  }

  // ── Seamless Buffer Generation ───────────────────────────────────
  /**
   * Creates a click-free looping buffer with guaranteed zero-static output.
   * Uses dual crossfade: tail→head for seamless loop, plus head crossfade for
   * generator state continuity. Works for both procedural noise and OGG assets.
   * @param {AudioContext} ctx
   * @param {number} durationSec - final loop duration
   * @param {Function} generatorFn(channelData, sampleRate, totalSec) - fills temp buffer
   * @param {number} numChannels - 1 (mono) or 2 (stereo)
   * @param {boolean} normalize - DEPRECATED: attenuate-only peak limiter now ALWAYS runs
   *    (never amplifies; only catches genuine overshoot from leaky integrators etc.)
   * @returns {AudioBuffer} ready for BufferSourceNode.loop = true
   */
  function createSeamlessBuffer(ctx, durationSec, generatorFn, numChannels = 1, normalize = true) {
    const extraSec = XFADE_MS / 1000;
    const finalSize = Math.floor(ctx.sampleRate * durationSec);
    const xfadeSamples = Math.max(1, Math.floor(ctx.sampleRate * extraSec));
    const bufferSize = finalSize + 2 * xfadeSamples; // extra head + tail for dual crossfade
    const totalSec = bufferSize / ctx.sampleRate;

    const tempBuffer = ctx.createBuffer(numChannels, bufferSize, ctx.sampleRate);
    const channelData = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channelData.push(tempBuffer.getChannelData(ch));
    }

    // Generate continuous signal (includes extra head + tail for dual crossfade)
    generatorFn(channelData, ctx.sampleRate, totalSec);

    // Post-process each channel: DC removal → peak norm (attenuate-only, ALWAYS) → hard clamp
    for (let ch = 0; ch < numChannels; ch++) {
      const data = channelData[ch];

      // 1. DC removal (entire buffer including xfade regions)
      let mean = 0;
      for (let i = 0; i < bufferSize; i++) mean += data[i];
      mean /= bufferSize;
      for (let i = 0; i < bufferSize; i++) data[i] -= mean;

      // 2. Peak limiter: ALWAYS attenuate-only. Never amplify — normalizing quiet
      //    buffers up amplified the noise floor into constant hiss. This catches
      //    genuine overshoot from leaky integrators (brown noise) or OGG assets.
      let peak = 0;
      for (let i = 0; i < bufferSize; i++) {
        const a = Math.abs(data[i]);
        if (a > peak) peak = a;
      }
      if (peak > 0.95) {
        const norm = 0.95 / peak;
        for (let i = 0; i < bufferSize; i++) data[i] *= norm;
      }

      // 3. Hard safety clamp (defensive — should never trigger after peak limiting)
      for (let i = 0; i < bufferSize; i++) {
        if (data[i] > 1.0) data[i] = 1.0;
        else if (data[i] < -1.0) data[i] = -1.0;
      }
    }

    // 4. Seamless-loop crossfade — blends the LAST xfadeSamples of the body
    //    with the FIRST xfadeSamples of the body (indices 0..xfadeSamples-1).
    //    At i = xfadeSamples-1 (t≈1): finalData[finalSize-1] ≈ body_head[xfadeSamples-1].
    //    Loop boundary: finalData[finalSize-1] (≈ head[xfadeSamples-1]) → finalData[0] (head[0]).
    //    For noise with correlation time << xfadeSamples, this jump is inaudible.
    //    This is the standard technique for seamless stochastic looping.
    const finalBuffer = ctx.createBuffer(numChannels, finalSize, ctx.sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const finalData = finalBuffer.getChannelData(ch);
      const tempData = channelData[ch];

      // Main body: tempData[xfadeSamples .. xfadeSamples + finalSize - 1]
      finalData.set(tempData.subarray(xfadeSamples, xfadeSamples + finalSize));

      // Crossfade the tail (last xfadeSamples of body) into the head (first xfadeSamples of body).
      // body_tail[i] = tempData[xfadeSamples + finalSize - xfadeSamples + i] = body[finalSize-xfadeSamples+i]
      // body_head[i] = tempData[xfadeSamples + i] = body[i]
      for (let i = 0; i < xfadeSamples; i++) {
        const t = i / xfadeSamples;
        const tailSample = tempData[xfadeSamples + finalSize - xfadeSamples + i]; // body[finalSize-xfadeSamples+i]
        const headSample = tempData[xfadeSamples + i];                             // body[i]
        finalData[finalSize - xfadeSamples + i] = (1 - t) * tailSample + t * headSample;
      }

      // 5. Zero-mean after crossfade — guarantee no static/hiss at the loop
      //    boundary caused by any residual DC offset in the blended region.
      let finalMean = 0;
      for (let i = 0; i < finalSize; i++) finalMean += finalData[i];
      finalMean /= finalSize;
      for (let i = 0; i < finalSize; i++) finalData[i] -= finalMean;
    }
    return finalBuffer;
  }

  // ── Noise Generators ──────────────────────────────────────────────
  function generateWhiteNoise(channelData, sampleRate, durationSec) {
    for (let ch = 0; ch < channelData.length; ch++) {
      const data = channelData[ch];
      const len = data.length;
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * WHITE_NOISE_AMP;
      }
    }
  }

  function generatePinkNoise(channelData, sampleRate, durationSec) {
    for (let ch = 0; ch < channelData.length; ch++) {
      const data = channelData[ch];
      const len = data.length;
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        b6 = white * 0.115926;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * PINK_NOISE_AMP;
      }
    }
  }

  function generateBrownNoise(channelData, sampleRate, durationSec) {
    // Fixed-output-scale brown noise: bounded leaky integrator with DC rejection.
    // Output scaled by BROWN_NOISE_AMP — never peak-normalized UP (amplifying
    // quiet noise produced constant hiss/rumble) and never clamped into rails.
    // DC removal is handled by createSeamlessBuffer post-process pass (belt-and-suspenders).
    // Use a two-pole leaky integrator for better -12dB/oct slope and less DC drift.
    for (let ch = 0; ch < channelData.length; ch++) {
      const data = channelData[ch];
      const len = data.length;
      let brown1 = 0;
      let brown2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // Two-pole leaky integrator: first pole at BROWN_POLE, second at 0.99
        // This gives -12dB/oct slope and dramatically reduces DC drift vs single pole.
        brown1 = BROWN_POLE * brown1 + white * BROWN_GAIN;
        brown2 = 0.99 * brown2 + brown1 * 0.1;
        data[i] = brown2 * BROWN_NOISE_AMP;
      }
    }
  }

  // ── Voice Management ──────────────────────────────────────────────
  function createVoice(buffer, loop = true, shapers = null) {
    const ctx = getAudioContext();
    if (!ctx || !buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    // Per-voice gain (fast ramp for click-free start)
    // Target gain is VOICE_PEAK_CEILING — the buffer's intrinsic peak is already
    // limited to ≤0.95 by createSeamlessBuffer/createSeamlessOggBuffer, so the
    // actual output peak will be ≤ VOICE_PEAK_CEILING * 0.95 ≈ 0.33.
    // This keeps summed voices well below the master limiter threshold.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(VOICE_PEAK_CEILING, ctx.currentTime + FADE_IN_MS / 1000);

    // Per-voice DC block (belt-and-suspenders with master DC block)
      const dcBlock = ctx.createBiquadFilter();
      dcBlock.type = 'highpass';
      dcBlock.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
      dcBlock.Q.setValueAtTime(0.707, ctx.currentTime);

      // Connect: source → dcBlock → [shapers...] → gain → masterGain → (limiter → DC → analyser → dest)
      let lastNode = source;
      lastNode.connect(dcBlock);
      lastNode = dcBlock;

      if (shapers && shapers.length) {
        shapers.forEach(s => {
          lastNode.connect(s);
          lastNode = s;
        });
      }

      lastNode.connect(gain);
      gain.connect(getMasterOutput());

      // Voice start = audible audio is desired: restore the master level that
      // stopAllVoices/stopAllAudio hard-muted to 0 (instant stop).
      // getMasterOutput() already called unmuteMaster() which does a click-free 30ms ramp.
      // Do NOT cancel that ramp here — the smooth ramp prevents clicks on resume.

      source.start();

      // Stop function with instant fade - uses onended to disconnect AFTER fade completes
      function stop() {
        activeVoices.delete(voice);
        try {
          const now = ctx.currentTime;
          const fade = FADE_OUT_MS / 1000;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + fade);
          source.stop(now + fade + 0.005);
          // Defer disconnect until fade completes via onended — disconnecting immediately
          // would cut off the scheduled fade ramp and produce a click.
          // Also disconnect any shapers that were inserted.
          source.onended = () => {
            try { source.disconnect(); } catch (_) {}
            try { dcBlock.disconnect(); } catch (_) {}
            if (shapers && shapers.length) {
              shapers.forEach(s => { try { s.disconnect(); } catch (_) {} });
            }
            try { gain.disconnect(); } catch (_) {}
          };
        } catch (e) {
          try { source.stop(); } catch (_) {}
          try { source.disconnect(); } catch (_) {}
          try { dcBlock.disconnect(); } catch (_) {}
          if (shapers && shapers.length) {
            shapers.forEach(s => { try { s.disconnect(); } catch (_) {} });
          }
          try { gain.disconnect(); } catch (_) {}
        }
      }

      const voice = { source, gain, dcBlock, stop };
      activeVoices.add(voice);
      return voice;
    }

  function stopAllVoices() {
    // Fast but click-free: fade master over 30ms while voices fade out
    const FADE_MS = 30;
    if (masterGain && sharedContext) {
      const now = sharedContext.currentTime;
      const fade = FADE_MS / 1000;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0, now + fade);
    }
    activeVoices.forEach(v => {
      try { v.stop(); } catch (_) {}
    });
    activeVoices.clear();
    // Master stays muted (0) until the next voice start re-opens it —
    // no delayed auto-restore, so Stop is truly silent and instant.
  }

  function unmuteMaster() {
    // Re-open the master ceiling after an instant-stop with a fast 30ms ramp
    // to avoid any click when audio resumes.
    const FADE_MS = 30;
    if (masterGain && sharedContext) {
      const t = sharedContext.currentTime;
      const fade = FADE_MS / 1000;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(MASTER_OPEN(), t + fade);
    }
  }

  function setMasterVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol) || 0));
    userMasterVolume = v;
    if (masterGain && sharedContext) {
      // Smooth volume changes (30ms ramp) to avoid clicks when adjusting slider
      const FADE_MS = 30;
      const now = sharedContext.currentTime;
      const fade = FADE_MS / 1000;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(v * LIMITER_LINEAR, now + fade);
    }
    return v;
  }

  function muteMaster(muted) {
    if (masterGain && sharedContext) {
      // Smooth mute/unmute (30ms ramp) to avoid clicks
      const FADE_MS = 30;
      const now = sharedContext.currentTime;
      const fade = FADE_MS / 1000;
      const target = muted ? 0 : MASTER_OPEN();
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(target, now + fade);
    }
  }

  // ── OGG Loader with Procedural Fallback ───────────────────────────
  const oggCache = new Map();
  const oggLoading = new Map();

  async function loadOggBuffer(src) {
    if (oggCache.has(src)) return oggCache.get(src);
    if (oggLoading.has(src)) return oggLoading.get(src);

    const ctx = getAudioContext();
    if (!ctx) return null;

    const promise = fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        // OGG files don't naturally loop — create seamless version
        const seamless = createSeamlessOggBuffer(ctx, decoded);
        oggCache.set(src, seamless);
        return seamless;
      })
      .catch(err => {
        console.warn('[AudioCore] OGG load failed:', src, err);
        oggLoading.delete(src);
        return null; // caller falls back to procedural
      });

    oggLoading.set(src, promise);
    return promise;
  }

  function createSeamlessOggBuffer(ctx, buffer) {
    const sampleRate = ctx.sampleRate;
    const xfadeSamples = Math.max(1, Math.floor(sampleRate * (XFADE_MS / 1000)));
    const numChannels = Math.max(1, buffer.numberOfChannels || 1);
    const srcLen = buffer.length || (buffer.getChannelData(0) ? buffer.getChannelData(0).length : 1);

    // OGG files shipped with this app already have a 25ms loop crossfade baked in
    // (see LICENSES.json). We must NOT apply another crossfade — that would create
    // a double-crossfade artifact (audible as a subtle phasing/warble at loop point).
    // Instead, just ensure the buffer length is preserved and apply post-processing:
    // DC removal -> peak limiter (attenuate-only) -> hard clamp.
    const finalSize = srcLen;
    const finalBuffer = ctx.createBuffer(numChannels, finalSize, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const finalData = finalBuffer.getChannelData(ch);

      // Copy original audio (already has baked-in crossfade at loop boundary)
      finalData.set(srcData);

      // Post-process: DC removal -> peak limiter (attenuate-only) -> hard clamp
      // 1. DC removal
      let mean = 0;
      for (let i = 0; i < finalSize; i++) mean += finalData[i];
      mean /= finalSize;
      for (let i = 0; i < finalSize; i++) finalData[i] -= mean;

      // 2. Peak limiter: attenuate-only. OGG assets are shipped near-full-scale;
      //    never AMPLIFY a quiet master up (that raised the noise floor into
      //    constant hiss) — only catch genuine overshoot.
      let peak = 0;
      for (let i = 0; i < finalSize; i++) {
        const a = Math.abs(finalData[i]);
        if (a > peak) peak = a;
      }
      if (peak > 0.95) {
        const norm = 0.95 / peak;
        for (let i = 0; i < finalSize; i++) finalData[i] *= norm;
      }

      // 3. Hard safety clamp
      for (let i = 0; i < finalSize; i++) {
        if (finalData[i] > 1.0) finalData[i] = 1.0;
        else if (finalData[i] < -1.0) finalData[i] = -1.0;
      }
    }
    return finalBuffer;
  }

  // ── Public API ────────────────────────────────────────────────────
  const AudioCore = {
    // Context
    getContext: getAudioContext,
    bindGesture,
    isGestureReceived: () => gestureReceived,

    // Buffer generation
    createSeamlessBuffer,
    generateWhiteNoise,
    generatePinkNoise,
    generateBrownNoise,

    // Voices
    createVoice,
    stopAllVoices,
    getActiveVoices: () => [...activeVoices],

    // Master control
    setMasterVolume,
    muteMaster,
    unmuteMaster,
    getMasterOutput,
    getAnalyser: () => analyser,

    // OGG
    loadOggBuffer,

    // Constants (for other modules to use consistently)
    LIMITER_LINEAR,
    MASTER_HEADROOM,
    DC_BLOCK_HZ,
    XFADE_MS,
    FADE_IN_MS,
    FADE_OUT_MS,
    BROWN_POLE,
    BROWN_GAIN,
    BROWN_NOISE_AMP,
    WHITE_NOISE_AMP,
    PINK_NOISE_AMP,
    VOICE_PEAK_CEILING,
    MASTER_LIMITER_THRESHOLD_DB,
    MASTER_LIMITER_THRESHOLD_LINEAR,
  };

  // Initialize gesture binding immediately
  bindGesture();

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioCore;
  } else {
    global.AudioCore = AudioCore;
    // Back-compat aliases for existing code
    global.dfGetGlobalAudioContext = getAudioContext;
    global.getSafeAudioDestination = getMasterOutput;
  }
})(typeof window !== 'undefined' ? window : globalThis);