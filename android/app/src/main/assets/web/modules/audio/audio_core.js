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
  const BROWN_NOISE_AMP = 0.05;                               // fixed output scale — never peak-normalized up
  const WHITE_NOISE_AMP = 0.06;                                // consistent across all modules
  const PINK_NOISE_AMP = 0.08;                                 // consistent across all modules

  // ── AudioContext Singleton ────────────────────────────────────────
  let sharedContext = null;
  let gestureReceived = false;
  let masterGain = null;
  let masterLimiter = null;
  let masterDCBlock = null;
  let analyser = null;
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
    masterGain.gain.setValueAtTime(0.7 * LIMITER_LINEAR, ctx.currentTime);

    // Master limiter (catches any overshoot from stacked voices)
    masterLimiter = ctx.createDynamicsCompressor();
    masterLimiter.threshold.setValueAtTime(-12, ctx.currentTime);
    masterLimiter.knee.setValueAtTime(24, ctx.currentTime);
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
   * Creates a click-free looping buffer.
   * @param {AudioContext} ctx
   * @param {number} durationSec - final loop duration
   * @param {Function} generatorFn(channelData, sampleRate, totalSec) - fills temp buffer
   * @param {number} numChannels - 1 (mono) or 2 (stereo)
   * @param {boolean} normalize - attenuate-only peak limiter above 0.95 (never amplifies; default true is safe for OGG, pass false for procedural noise where the generator already controls amplitude)
   * @returns {AudioBuffer} ready for BufferSourceNode.loop = true
   */
  function createSeamlessBuffer(ctx, durationSec, generatorFn, numChannels = 1, normalize = true) {
    const extraSec = XFADE_MS / 1000;
    const finalSize = Math.floor(ctx.sampleRate * durationSec);
    const xfadeSamples = Math.max(1, Math.floor(ctx.sampleRate * extraSec));
    const bufferSize = finalSize + xfadeSamples;
    const totalSec = bufferSize / ctx.sampleRate;

    const tempBuffer = ctx.createBuffer(numChannels, bufferSize, ctx.sampleRate);
    const channelData = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channelData.push(tempBuffer.getChannelData(ch));
    }

    // Generate continuous signal (includes xfade tail)
    generatorFn(channelData, ctx.sampleRate, totalSec);

    // Post-process each channel: DC removal → peak norm → hard clamp
    for (let ch = 0; ch < numChannels; ch++) {
      const data = channelData[ch];

      // 1. DC removal (entire buffer including xfade tail)
      let mean = 0;
      for (let i = 0; i < bufferSize; i++) mean += data[i];
      mean /= bufferSize;
      for (let i = 0; i < bufferSize; i++) data[i] -= mean;

      // 2. Optional peak limiter: attenuate-only. Never amplify (normalizing
      //    quiet buffers up amplified the noise floor into constant hiss).
      if (normalize) {
        let peak = 0;
        for (let i = 0; i < bufferSize; i++) {
          const a = Math.abs(data[i]);
          if (a > peak) peak = a;
        }
        if (peak > 0.95) {
          const norm = 0.95 / peak;
          for (let i = 0; i < bufferSize; i++) data[i] *= norm;
        }
      }

      // 3. Hard safety clamp (always applied — prevents clipping regardless of normalization)
      for (let i = 0; i < bufferSize; i++) {
        if (data[i] > 1.0) data[i] = 1.0;
        else if (data[i] < -1.0) data[i] = -1.0;
      }
    }

    // 4. Crossfade tail into head for seamless loop
    const finalBuffer = ctx.createBuffer(numChannels, finalSize, ctx.sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const finalData = finalBuffer.getChannelData(ch);
      const tempData = channelData[ch];

      // Body: copy main segment unchanged
      finalData.set(tempData.subarray(0, finalSize));

      // Head crossfade: blend natural tail continuation into head
      // finalData[0] = tempData[finalSize] (continuation of tempData[finalSize-1])
      // finalData[xfadeSamples-1] ≈ tempData[xfadeSamples-1] (head)
      for (let i = 0; i < xfadeSamples; i++) {
        const t = i / xfadeSamples;
        finalData[i] = (1 - t) * tempData[finalSize + i] + t * tempData[i];
      }
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
    // Fixed-output-scale brown noise: bounded leaky integrator scaled by
    // BROWN_NOISE_AMP (peak ≈ 0.5) — never peak-normalized UP (amplifying quiet
    // noise produced constant hiss/rumble) and never clamped into rails.
    for (let ch = 0; ch < channelData.length; ch++) {
      const data = channelData[ch];
      const len = data.length;
      let brown = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        brown = BROWN_POLE * brown + white * BROWN_GAIN;
        data[i] = brown * BROWN_NOISE_AMP;
      }
    }
  }

  // ── Voice Management ──────────────────────────────────────────────
  function createVoice(buffer, loop = true) {
    const ctx = getAudioContext();
    if (!ctx || !buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    // Per-voice gain (fast ramp for click-free start)
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN_MS / 1000);

    // Per-voice DC block (belt-and-suspenders with master DC block)
    const dcBlock = ctx.createBiquadFilter();
    dcBlock.type = 'highpass';
    dcBlock.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
    dcBlock.Q.setValueAtTime(0.707, ctx.currentTime);

    // Connect: source → dcBlock → gain → masterGain → (limiter → DC → analyser → dest)
    source.connect(dcBlock);
    dcBlock.connect(gain);
    gain.connect(getMasterOutput());

    // Voice start = audible audio is desired: restore the master level that
    // stopAllVoices/stopAllAudio hard-muted to 0 (instant stop). Without this,
    // nothing could ever play again after a Stop.
    if (masterGain && sharedContext) {
      const t = sharedContext.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(0.7 * LIMITER_LINEAR, t);
    }

    source.start();

    // Stop function with instant fade - no setTimeout, truly instant
    function stop() {
      activeVoices.delete(voice);
      try {
        const now = ctx.currentTime;
        const fade = FADE_OUT_MS / 1000;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fade);
        source.stop(now + fade + 0.005);
        // Synchronous disconnect - no setTimeout delay
        try { source.disconnect(); } catch (_) {}
        try { dcBlock.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      } catch (e) {
        try { source.stop(); } catch (_) {}
        try { source.disconnect(); } catch (_) {}
        try { dcBlock.disconnect(); } catch (_) {}
        try { gain.disconnect(); } catch (_) {}
      }
    }

    const voice = { source, gain, dcBlock, stop };
    activeVoices.add(voice);
    return voice;
  }

  function stopAllVoices() {
    // Truly instant: mute master immediately AND stop all voices
    if (masterGain && sharedContext) {
      masterGain.gain.cancelScheduledValues(sharedContext.currentTime);
      masterGain.gain.setValueAtTime(0, sharedContext.currentTime);
    }
    activeVoices.forEach(v => {
      try { v.stop(); } catch (_) {}
    });
    activeVoices.clear();
    // Master stays hard-muted (0) until the next voice start re-opens it —
    // no delayed auto-restore, so Stop is truly silent and instant.
  }

  function unmuteMaster() {
    // Re-open the master hard ceiling after an instant-stop (which sets it to 0).
    // Called when a new voice/preset actually starts playing — never on its own.
    if (masterGain && sharedContext) {
      const t = sharedContext.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(0.7 * LIMITER_LINEAR, t);
    }
  }

  function setMasterVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol) || 0));
    if (masterGain && sharedContext) {
      masterGain.gain.setValueAtTime(v * LIMITER_LINEAR, sharedContext.currentTime);
    }
    return v;
  }

  function muteMaster(muted) {
    if (masterGain && sharedContext) {
      masterGain.gain.cancelScheduledValues(sharedContext.currentTime);
      masterGain.gain.setValueAtTime(muted ? 0 : (0.7 * LIMITER_LINEAR), sharedContext.currentTime);
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
    const finalSize = Math.max(1, srcLen - xfadeSamples);

    const finalBuffer = ctx.createBuffer(numChannels, finalSize, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const finalData = finalBuffer.getChannelData(ch);

      // Body: copy middle section (skip first xfadeSamples)
      for (let i = xfadeSamples; i < finalSize; i++) {
        finalData[i] = srcData[i];
      }
      // Head crossfade: blend tail into head
      for (let i = 0; i < xfadeSamples && i < finalSize; i++) {
        const t = i / xfadeSamples;
        finalData[i] = srcData[i] * t + srcData[finalSize + i] * (1 - t);
      }

      // Post-process: DC removal → peak normalize → hard clamp (same as procedural buffers)
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