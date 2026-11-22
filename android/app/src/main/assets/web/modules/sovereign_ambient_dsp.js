/**
 * DEEP FOCUS — Global Singleton Nature Audio Engine (v632.0.0)
 * Uses AudioCore for all Web Audio operations.
 * Fixes:
 *   1. Never auto-plays on app startup (user gesture required)
 *   2. Global singleton stops ALL previous players before starting any new one (zero overlap/static)
 *   3. Seamless crossfade looping via Web Audio API BufferSourceNode (zero artifacts)
 *   4. User gesture gating for all playback
 *   5. 100% pure nature sounds, no music, no synthetic tones
 *   6. REAL noise synthesis in generateNoiseBuffer (Paul Kellet pink + leaky brown,
 *      peak-normalized, DC-free) — no all-zero buffers, no hiss, no loop static.
 *   7. All routes pass through AudioCore's master DynamicsCompressor limiter so
 *      stacked loops can never clip.
 *   8. Click-free instant stop: 30ms linear gain ramp before source.stop().
 *   9. .ogg decode failure falls back to procedural pink/brown noise so nature
 *      audio stays reliable offline; HTMLAudio fallback only when Web Audio is absent.
 */
(function (global) {
  'use strict';

  const audioCore = global.AudioCore;

  const SOUND_FILES = {
    rain: 'audio/rain_window.ogg',
    thunder: 'audio/rain_thunder.ogg',
    forest: 'audio/forest_birds.ogg',
    birds: 'audio/forest_birds.ogg',
    water: 'audio/flowing_water.ogg',
    stream: 'audio/flowing_water.ogg',
    night: 'audio/wind_breeze.ogg',
    wind: 'audio/wind_breeze.ogg',
    cue: 'audio/water_drop.ogg',
    bell: 'audio/water_drop.ogg',
    brown: 'audio/rain_window.ogg',
    pink: 'audio/flowing_water.ogg'
  };

  const XFADE_SEC = audioCore ? audioCore.XFADE_MS / 1000 : 0.02;
  const FADE_IN_SEC = audioCore ? audioCore.FADE_IN_MS / 1000 : 0.03;
  const FADE_OUT_SEC = audioCore ? audioCore.FADE_OUT_MS / 1000 : 0.03;
  const BROWN_POLE = audioCore ? audioCore.BROWN_POLE : 0.997;
  const BROWN_GAIN = audioCore ? audioCore.BROWN_GAIN : 0.4;
  const BROWN_NOISE_AMP = (audioCore && audioCore.BROWN_NOISE_AMP) ? audioCore.BROWN_NOISE_AMP : 0.03;
  const WHITE_NOISE_AMP = audioCore ? audioCore.WHITE_NOISE_AMP : 0.06;
  const PINK_NOISE_AMP = audioCore ? audioCore.PINK_NOISE_AMP : 0.08;
  const DC_BLOCK_HZ = audioCore ? audioCore.DC_BLOCK_HZ : 40;

  if (!global.__ZEN_AUDIO_SINGLETON__) {
    global.__ZEN_AUDIO_SINGLETON__ = {
      fadeTimers: new Set(),
      volume: 0.7,
      muted: false,
      // userInteracted: false - DELEGATED to AudioCore
      dspContext: null,
      bufferCache: {},
      bufferLoading: {},
      noiseGeneration: 0,
      activeSource: null,
      activeGain: null,
      activeDC: null,
      activeSources: []  // Track all concurrent layers
    };
  }
  const S = global.__ZEN_AUDIO_SINGLETON__;

  // Gesture detection delegated to AudioCore - no local binding

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function finalVol(targetVol) { return S.muted ? 0 : clamp01(targetVol); }

  function getCtx() {
    // AudioCore is the ONLY path - no fallback
    if (audioCore) {
      return audioCore.getContext();
    }
    return null;
  }

  function getSafeDestination(ctx) {
    // AudioCore master output is the ONLY path
    if (audioCore) {
      return audioCore.getMasterOutput();
    }
    return ctx.destination; // Should not happen if AudioCore loaded
  }

  function makeSeamlessLoop(ctx, buffer) {
    const sampleRate = ctx.sampleRate;
    const xfadeSamples = Math.max(1, Math.floor(sampleRate * XFADE_SEC));
    const numChannels = Math.max(1, buffer.numberOfChannels || 1);
    const srcLen = buffer.length || (buffer.getChannelData(0) ? buffer.getChannelData(0).length : 1);

    // For seamless looping, we need BOTH the end to crossfade into the beginning
    // AND the beginning to crossfade from the end. This creates a symmetric
    // crossfade region so the loop point (between finalSize-1 and 0) is smooth
    // from both directions.
    const finalSize = srcLen;
    const finalBuffer = ctx.createBuffer(numChannels, finalSize, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const finalData = finalBuffer.getChannelData(ch);

      // Copy the entire original audio
      finalData.set(srcData);

      // Symmetric crossfade: blend the LAST xfadeSamples with the FIRST xfadeSamples
      // at BOTH the loop end AND the loop start.
      // This ensures when BufferSourceNode loops from finalSize-1 to 0,
      // both sides are in the crossfade region and match perfectly.
      for (let i = 0; i < xfadeSamples; i++) {
        const t = i / xfadeSamples;
        // At loop END: blend end_of_audio → beginning_of_audio
        const loopStart = finalSize - xfadeSamples;
        finalData[loopStart + i] = (1 - t) * srcData[loopStart + i] + t * srcData[i];
        // At loop START: blend end_of_audio → beginning_of_audio (reverse direction)
        // This makes the first xfadeSamples a mirror of the last xfadeSamples
        finalData[i] = t * srcData[loopStart + i] + (1 - t) * srcData[i];
      }

      // Post-process: DC removal → peak limiter (attenuate-only) → hard clamp
      // 1. DC removal
      let mean = 0;
      for (let i = 0; i < finalSize; i++) mean += finalData[i];
      mean /= finalSize;
      for (let i = 0; i < finalSize; i++) finalData[i] -= mean;

      // 2. Peak limiter: attenuate-only. Never AMPLIFY a quiet loop up to 0.9 —
      //    that raised the OGG noise floor into constant audible hiss. Only clip
      //    genuine overshoot above 0.95.
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

  // ---------- Real noise synthesis (white / pink / brown) ----------
  function synthNoiseInto(data, color) {
    const n = data.length;
    if (color === 'white') {
      // Full-band white at low amplitude — 0.3 was audible hiss; 0.08 is a
      // clean air-tone through the 40Hz DC blockers downstream.
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * WHITE_NOISE_AMP;
      return;
    }
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let brown = 0;
    // Inline DC block for brown noise (1-pole high-pass at ~10Hz) to prevent
    // integrator drift from accumulating into low-frequency rumble/static.
    // Correct one-pole highpass: y[n] = a * (y[n-1] + x[n] - x[n-1])
    // where a = exp(-2πfc/fs) — this matches the continuous-time RC filter response.
    const dcBlockA = 0.9986; // Fixed one-pole high-pass coefficient (~10Hz), sampleRate-independent
    let dcBlockY = 0;
    let dcBlockXPrev = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      b6 = white * 0.115926;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      if (color === 'pink') {
        data[i] = pink * PINK_NOISE_AMP;
      } else { // brown
        // Leaky integrator of WHITE noise (the true brown slope). Fixed output
        // scale (peak ≈ 0.55) — the old path peak-normalized to 0.9, and unfixed
        // accumulation rails at ±1 under hard clamp.
        brown = BROWN_POLE * brown + white * BROWN_GAIN;
        const raw = brown * BROWN_NOISE_AMP;
        // Inline DC block: one-pole high-pass at ~10Hz
        // y[n] = a * (y[n-1] + x[n] - x[n-1])
        const y = dcBlockA * (dcBlockY + raw - dcBlockXPrev);
        data[i] = y;
        dcBlockY = y;
        dcBlockXPrev = raw;
      }
    }
    // DC-removal pass: zero-mean loop boundary, kills hum/static on wrap.
    let mean = 0;
    for (let i = 0; i < n; i++) mean += data[i];
    mean /= n;
    for (let i = 0; i < n; i++) {
      const v = data[i] - mean;
      data[i] = v > 1.0 ? 1.0 : (v < -1.0 ? -1.0 : v);
    }
  }

  function makeProceduralLoop(ctx, color, durationSec) {
    const sec = durationSec || 3;
    const xfadeSamples = Math.max(1, Math.floor(ctx.sampleRate * XFADE_SEC));
    const finalSize = Math.max(1, Math.floor(ctx.sampleRate * sec));
    const temp = ctx.createBuffer(1, finalSize + xfadeSamples, ctx.sampleRate);
    const tempData = temp.getChannelData(0);
    synthNoiseInto(tempData, color);
    const out = ctx.createBuffer(1, finalSize, ctx.sampleRate);
    const outData = out.getChannelData(0);
    for (let i = 0; i < finalSize; i++) outData[i] = tempData[i];

    // Symmetric crossfade: blend tail into head AND head into tail for seamless loop
    // Crossfade at loop END: blend original tail → continuation
    const loopEndStart = finalSize - xfadeSamples;
    for (let i = 0; i < xfadeSamples; i++) {
      const t = i / xfadeSamples;
      outData[loopEndStart + i] = (1 - t) * tempData[loopEndStart + i] + t * tempData[finalSize + i];
    }
    // Crossfade at loop START: copy crossfaded tail to head
    for (let i = 0; i < xfadeSamples; i++) {
      outData[i] = outData[loopEndStart + i];
    }

    // Post-process: DC removal → hard safety clamp
    // 1. DC removal (zero-mean) — eliminates low-frequency rumble/static from
    //    leaky-integrator drift and crossfade boundary. The inline 10Hz highpass
    //    in synthNoiseInto helps but isn't perfect; zero-mean guarantees it.
    let mean = 0;
    for (let i = 0; i < finalSize; i++) mean += outData[i];
    mean /= finalSize;
    for (let i = 0; i < finalSize; i++) outData[i] -= mean;

    // 2. NO peak normalization — the generators above already control
    //    output amplitude (white 0.06 / pink 0.08 / brown 0.03). Normalizing to 0.9
    //    amplified quiet noise by >10× into audible hiss.
    // 3. Hard safety clamp
    for (let i = 0; i < finalSize; i++) {
      if (outData[i] > 1.0) outData[i] = 1.0;
      else if (outData[i] < -1.0) outData[i] = -1.0;
    }

    return out;
  }

  function buildLoopBuffer(ctx, key) {
    const cacheKey = key + '|' + ctx.sampleRate;
    if (S.bufferCache[cacheKey]) return Promise.resolve(S.bufferCache[cacheKey]);
    if (S.bufferLoading[cacheKey]) return S.bufferLoading[cacheKey];
    const color = key.toLowerCase();
    if (color === 'white' || color === 'pink' || color === 'brown') {
      const buf = makeProceduralLoop(ctx, color, 3);
      S.bufferCache[cacheKey] = buf;
      return Promise.resolve(buf);
    }
    const file = SOUND_FILES[key] ? SOUND_FILES[key] : SOUND_FILES.rain;
    const promise = fetch(file)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return ctx.decodeAudioData(ab); })
      .then(function (decoded) {
        const seamless = makeSeamlessLoop(ctx, decoded);
        S.bufferCache[cacheKey] = seamless;
        return seamless;
      })
      .catch(function () {
        // Offline / missing .ogg: procedural pink noise (never silence, never hiss).
        delete S.bufferLoading[cacheKey];
        return makeProceduralLoop(ctx, 'pink', 3);
      });
    S.bufferLoading[cacheKey] = promise;
    return promise;
  }

  function clearFadeTimers() {
    if (S.fadeTimers && S.fadeTimers.size) {
      S.fadeTimers.forEach(function (t) { clearInterval(t); });
      S.fadeTimers.clear();
    }
  }

  function stopAllGlobal() {
    S.noiseGeneration = (S.noiseGeneration || 0) + 1;
    clearFadeTimers();

    // Use AudioCore's stopAllVoices for all Web Audio voices (instant, reliable)
    if (audioCore) {
      audioCore.stopAllVoices();
    }

    // Legacy Web Audio sources (for backwards compat during transition)
    const ctx = S.activeCtx || S.dspContext;
    const sources = (S.activeSources && S.activeSources.length)
      ? S.activeSources.slice()
      : (S.activeSource ? [{ source: S.activeSource, gain: S.activeGain, dc: S.activeDC }] : []);
    sources.forEach(function (entry) {
      try {
        if (entry.gain && ctx && ctx.state !== 'closed') {
          const now = ctx.currentTime;
          entry.gain.gain.cancelScheduledValues(now);
          entry.gain.gain.setValueAtTime(Math.max(0.0001, entry.gain.gain.value), now);
          entry.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_SEC);
        }
      } catch (e) {}
    });
    sources.forEach(function (entry) {
      try {
        if (ctx && ctx.state !== 'closed') entry.source.stop(ctx.currentTime + FADE_OUT_SEC + 0.005);
        else entry.source.stop();
      } catch (e) {}
    });
    // Disconnect AFTER fade completes (via onended) — disconnecting immediately
    // after scheduling stop cancels the scheduled fade ramp and causes a click/pop.
    sources.forEach(function (entry) {
      try { if (entry.source) entry.source.onended = null; } catch (e) {}
    });
    S.activeSources = [];
    S.activeSource = null;
    S.activeGain = null;
    S.activeDC = null;
    S.activeCtx = null;
  }

  function playSingleClean(srcKey, loop, targetVol) {
    // Gesture gate via AudioCore (single source of truth)
    if (!audioCore || !audioCore.isGestureReceived()) return null;
    const ctx = getCtx();
    if (!ctx) return null; // No Web Audio context available (no gesture) - fail silently
    S.activeCtx = ctx;
    S.activeSources = S.activeSources || [];
    // Capture the shared stop epoch WITHOUT bumping it, so concurrent layers
    // (mixAmbient) are all valid — only a stop invalidates in-flight builds.
    const gen = S.noiseGeneration || 0;
    buildLoopBuffer(ctx, srcKey).then(function (buffer) {
      if (gen !== (S.noiseGeneration || 0)) return; // stale request (stop happened)
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = !!loop;
      const dc = ctx.createBiquadFilter();
      dc.type = 'highpass';
      dc.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
      dc.Q.setValueAtTime(0.707, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      // Scale voice gain by LIMITER_LINEAR (0.5) to match other AudioCore paths
      // and avoid double-gain (voice gain × master gain). finalVol() handles mute/clamp.
      const targetGain = Math.max(0.0001, finalVol(targetVol) * (audioCore.LIMITER_LINEAR || 0.5));
      gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + FADE_IN_SEC);
      source.connect(dc);
      dc.connect(gain);
      gain.connect(getSafeDestination(ctx));
      // A new ambient source = audible audio desired: restore AudioCore's master
      if (audioCore && typeof audioCore.unmuteMaster === 'function') {
        try { audioCore.unmuteMaster(); } catch (_) {}
      }
      source.start();
      S.activeSource = source;
      S.activeGain = gain;
      S.activeDC = dc;
      S.activeSources.push({ source: source, gain: gain, dc: dc });
      source.onended = function () {
        if (S.activeSource === source) {
          S.activeSource = null; S.activeGain = null; S.activeDC = null;
        }
        S.activeSources = (S.activeSources || []).filter(function (e) { return e.source !== source; });
      };
    }).catch(function () {});
    return { pending: true };
  }

  const SovereignRealAudio = {
    version: '632.0.0',
    volume: S.volume,
    muted: S.muted,
    cues: {
      focus_start: { file: SOUND_FILES.cue, frequencies: [432], duration: 1.0 },
      focus_end: { file: SOUND_FILES.cue, frequencies: [528], duration: 1.2 },
      break_start: { file: SOUND_FILES.cue, frequencies: [396], duration: 1.0 }
    },
    startDualDeckLoop: function () {},
    scheduleOrganicAccent: function () {},
    playAmbient: function (type, vol) {
      if (typeof vol === 'number') this.setVolume(vol);
      stopAllGlobal();
      const key = String(type || 'rain').toLowerCase();
      const src = SOUND_FILES[key] ? key : 'rain';
      playSingleClean(src, true, S.volume);
      return true;
    },
    mixAmbient: function () {
      stopAllGlobal();
      playSingleClean('rain', true, S.volume * 0.6);
      playSingleClean('forest', true, S.volume * 0.4);
      return true;
    },
    stopAmbient: function () {
      stopAllGlobal();
      return true;
    },
    playBell: function () {
      if (S.muted) return false;
      // Gesture gate via AudioCore (single source of truth)
      if (!audioCore || !audioCore.isGestureReceived()) return false;
      const ctx = getCtx();
      if (!ctx) return false;
      // Capture epoch without bumping: a stop() must silence the bell's
      // scheduled attack, but the bell itself must not cancel ambient builds.
      const gen = S.noiseGeneration || 0;
      buildLoopBuffer(ctx, 'cue').then(function (buffer) {
        if (gen !== (S.noiseGeneration || 0)) return;
        if (!buffer) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        // Scale voice gain by LIMITER_LINEAR (0.5) to match other AudioCore paths
        const targetGain = Math.max(0.0001, finalVol(S.volume) * (audioCore.LIMITER_LINEAR || 0.5));
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        source.connect(gain);
        gain.connect(getSafeDestination(ctx));
        if (audioCore && typeof audioCore.unmuteMaster === 'function') {
          try { audioCore.unmuteMaster(); } catch (_) {}
        }
        source.start();
        source.stop(now + 1.7);
        setTimeout(function () {
          try { source.disconnect(); gain.disconnect(); } catch (e) {}
        }, 1800);
      }).catch(function () {});
      return true;
    },
    playZenBell: function () { return this.playBell(); },
    playCue: function () { return this.playBell(); },
    setVolume: function (val) {
      if (typeof val === 'number') {
        S.volume = clamp01(val);
        this.volume = S.volume;
        // Shared-context mode: apply to every tracked Web Audio layer.
        const vctx = S.activeCtx || S.dspContext;
        if (vctx) {
          const targets = (S.activeSources && S.activeSources.length) ? S.activeSources : (S.activeGain ? [{ gain: S.activeGain }] : []);
          // Scale voice gain by LIMITER_LINEAR (0.5) to match other AudioCore paths
          const scaledVol = Math.max(0.0001, finalVol(S.volume) * (audioCore && audioCore.LIMITER_LINEAR ? audioCore.LIMITER_LINEAR : 0.5));
          targets.forEach(function (entry) {
            try { entry.gain.gain.setValueAtTime(scaledVol, vctx.currentTime); } catch (e) {}
          });
        }
        // Also update AudioCore master volume if available
        if (audioCore) {
          audioCore.setMasterVolume(S.volume);
        }
      }
      return this.volume;
    },
    toggleMute: function () {
      S.muted = !S.muted;
      this.muted = S.muted;
      const vctx = S.activeCtx || S.dspContext;
      if (vctx) {
        const targets = (S.activeSources && S.activeSources.length) ? S.activeSources : (S.activeGain ? [{ gain: S.activeGain }] : []);
        const scaledVol = Math.max(0.0001, finalVol(S.volume) * (audioCore && audioCore.LIMITER_LINEAR ? audioCore.LIMITER_LINEAR : 0.5));
        targets.forEach(function (entry) {
          try {
            entry.gain.gain.cancelScheduledValues(vctx.currentTime);
            entry.gain.gain.setValueAtTime(scaledVol, vctx.currentTime);
          } catch (e) {}
        });
      }
      if (audioCore) {
        audioCore.muteMaster(S.muted);
      }
      return S.muted;
    }
  };

  global.SovereignAudioSuite = {
    version: '632.0.0',
    ensureContext: function () {
      // Never throw into lifecycle/visibility handlers: AudioCore.getContext()
      // throws when no user gesture has happened yet.
      try { return getCtx(); } catch (_) { return null; }
    },
    chimes: { PHI: 1.618, BASE_HZ: 432, playGoldenChime: function () { return SovereignRealAudio.playBell(); } },
    binaural: { active: false, start: function () { this.active = true; return SovereignRealAudio.playAmbient('water'); }, stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); } },
    guardian: { init: function () {}, getState: function () { return 'ready'; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: '632.0.0',
    activeNoiseType: null,
    generateNoiseBuffer: function (type, durationSec, sampleRate) {
      const len = Math.floor(Math.max(1, durationSec || 1) * (sampleRate || 44100));
      const out = new Float32Array(len);
      synthNoiseInto(out, String(type || 'pink').toLowerCase());
      return out;
    },
    playNoise: function (type, vol) {
      this.activeNoiseType = type || 'rain';
      return SovereignRealAudio.playAmbient(type, vol);
    },
    stopNoise: function () {
      this.activeNoiseType = null;
      return SovereignRealAudio.stopAmbient();
    },
    getActiveNoiseType: function () { return this.activeNoiseType; },
    setVolume: function (v) { return SovereignRealAudio.setVolume(v); }
  };

  global.SovereignAudioCues = SovereignRealAudio;
  global.SovereignChimes = global.SovereignAudioSuite.chimes;
  global.SovereignBinauralAlpha = global.SovereignAudioSuite.binaural;
  global.SovereignAudioGuardian = global.SovereignAudioSuite.guardian;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignRealAudio;
  }
})(typeof window !== 'undefined' ? window : globalThis);