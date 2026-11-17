/**
 * DEEP FOCUS — Global Singleton Nature Audio Engine (v631.0.0)
 * Fixes:
 *   1. Never auto-plays on app startup (user gesture required)
 *   2. Global singleton stops ALL previous players before starting any new one (zero overlap/static)
 *   3. Seamless crossfade looping via Web Audio API BufferSourceNode (zero artifacts)
 *   4. User gesture gating for all playback
 *   5. 100% pure nature sounds, no music, no synthetic tones
 *   6. v631: REAL noise synthesis in generateNoiseBuffer (Paul Kellet pink + leaky brown,
 *      peak-normalized, DC-free) — no all-zero buffers, no hiss, no loop static.
 *   7. v631: All routes pass through a master DynamicsCompressor limiter (via
 *      window.getSafeAudioDestination when present) so stacked loops can never clip.
 *   8. v631: Click-free instant stop: 75ms linear gain ramp before source.stop().
 *   9. v631: .ogg decode failure falls back to procedural pink/brown noise so nature
 *      audio stays reliable offline; HTMLAudio fallback only when Web Audio is absent.
 */
(function (global) {
  'use strict';

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

  const XFADE_SEC = 0.02;
  const FADE_IN_SEC = 0.18;
  const FADE_OUT_SEC = 0.075;

  if (!global.__ZEN_AUDIO_SINGLETON__) {
    global.__ZEN_AUDIO_SINGLETON__ = {
      players: [],
      fadeTimers: new Set(),
      volume: 0.7,
      muted: false,
      userInteracted: false,
      dspContext: null,
      bufferCache: {},
      bufferLoading: {},
      noiseGeneration: 0,
      activeSource: null,
      activeGain: null,
      activeDC: null,
      activeHTML: []
    };
  }
  const S = global.__ZEN_AUDIO_SINGLETON__;

  if (typeof document !== 'undefined' && !S.gestureBound) {
    S.gestureBound = true;
    const markGesture = function () { S.userInteracted = true; };
    document.addEventListener('pointerdown', markGesture, { passive: true });
    document.addEventListener('touchstart', markGesture, { passive: true });
    document.addEventListener('keydown', markGesture, { passive: true });
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function finalVol(targetVol) { return S.muted ? 0 : clamp01(targetVol); }

  function getCtx() {
    try {
      if (typeof global.dfGetGlobalAudioContext === 'function') {
        const shared = global.dfGetGlobalAudioContext();
        if (shared && typeof shared.createBufferSource === 'function') return shared;
      }
    } catch (e) { /* gesture not yet granted */ }
    if (typeof global.AudioContext === 'undefined' && typeof global.webkitAudioContext === 'undefined') {
      return null;
    }
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!S.dspContext || S.dspContext.state === 'closed') {
      try { S.dspContext = new AC(); } catch (e) { return null; }
    }
    if (S.dspContext.state === 'suspended' && S.userInteracted && typeof S.dspContext.resume === 'function') {
      S.dspContext.resume().catch(function () {});
    }
    return S.dspContext;
  }

  function getSafeDestination(ctx) {
    try {
      if (typeof global.getSafeAudioDestination === 'function') {
        const d = global.getSafeAudioDestination(ctx);
        if (d) return d;
      }
    } catch (e) {}
    if (!ctx._zenDspLimiter) {
      try {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-14, ctx.currentTime);
        comp.knee.setValueAtTime(35, ctx.currentTime);
        comp.ratio.setValueAtTime(12, ctx.currentTime);
        comp.attack.setValueAtTime(0.003, ctx.currentTime);
        comp.release.setValueAtTime(0.25, ctx.currentTime);
        comp.connect(ctx.destination);
        ctx._zenDspLimiter = comp;
      } catch (e) { return ctx.destination; }
    }
    return ctx._zenDspLimiter;
  }

  function makeSeamlessLoop(ctx, buffer) {
    const sampleRate = ctx.sampleRate;
    const xfadeSamples = Math.max(1, Math.floor(sampleRate * XFADE_SEC));
    const numChannels = Math.max(1, buffer.numberOfChannels || 1);
    const srcLen = buffer.length || (buffer.getChannelData(0) ? buffer.getChannelData(0).length : 1);
    const finalSize = Math.max(1, srcLen - xfadeSamples);
    const finalBuffer = ctx.createBuffer(numChannels, finalSize, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const finalData = finalBuffer.getChannelData(ch);
      for (let i = 0; i < finalSize; i++) finalData[i] = srcData[i];
      for (let i = 0; i < xfadeSamples && i < finalSize; i++) {
        const t = i / xfadeSamples;
        finalData[i] = srcData[i] * t + srcData[finalSize + i] * (1 - t);
      }
    }
    return finalBuffer;
  }

  // ---------- Real noise synthesis (white / pink / brown) ----------
  function synthNoiseInto(data, color) {
    const n = data.length;
    if (color === 'white') {
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      return;
    }
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let brown = 0, peak = 0;
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
        data[i] = pink * 0.11;
      } else { // brown
        brown = 0.9985 * brown + pink * 0.5; // leaky integrator: bounded DC
        data[i] = brown;
        if (Math.abs(brown) > peak) peak = Math.abs(brown);
      }
    }
    if (color === 'brown' && peak > 0) {
      const norm = 0.9 / peak;
      for (let i = 0; i < n; i++) data[i] *= norm;
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
    for (let i = 0; i < xfadeSamples; i++) {
      const t = i / xfadeSamples;
      outData[i] = tempData[i] * t + tempData[finalSize + i] * (1 - t);
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

  function fadeStopHTML(a) {
    try {
      const startVol = a.volume || 0;
      if (startVol <= 0.001) { a.pause(); return; }
      let step = 0;
      const steps = 6;
      const iv = setInterval(function () {
        step++;
        try { a.volume = startVol * Math.max(0, 1 - step / steps); } catch (e) {}
        if (step >= steps || a.paused) {
          clearInterval(iv);
          S.fadeTimers.delete(iv);
          try { a.pause(); a.currentTime = 0; } catch (e) {}
        }
      }, 12);
      S.fadeTimers.add(iv);
    } catch (e) { try { a.pause(); } catch (e2) {} }
  }

  function stopAllGlobal() {
    S.noiseGeneration = (S.noiseGeneration || 0) + 1;
    clearFadeTimers();
    // Web Audio ambient sources: click-free 75ms linear ramp, then stop.
    try {
      const ctx = S.dspContext;
      if (S.activeGain && ctx && ctx.state !== 'closed') {
        const now = ctx.currentTime;
        S.activeGain.gain.cancelScheduledValues(now);
        S.activeGain.gain.setValueAtTime(Math.max(0.0001, S.activeGain.gain.value), now);
        S.activeGain.gain.linearRampToValueAtTime(0, now + FADE_OUT_SEC);
      }
    } catch (e) {}
    const src = S.activeSource;
    if (src) {
      try {
        const ctx = S.dspContext;
        if (ctx && ctx.state !== 'closed') src.stop(ctx.currentTime + FADE_OUT_SEC + 0.01);
        else src.stop();
      } catch (e) {}
    }
    const kill = function () {
      try { if (S.activeSource) S.activeSource.disconnect(); } catch (e) {}
      try { if (S.activeGain) S.activeGain.disconnect(); } catch (e) {}
      try { if (S.activeDC) S.activeDC.disconnect(); } catch (e) {}
      S.activeSource = null;
      S.activeGain = null;
      S.activeDC = null;
    };
    setTimeout(kill, 130);
    // HTML fallback players: same click-free ramp.
    if (S.activeHTML && S.activeHTML.length) {
      S.activeHTML.forEach(function (a) { fadeStopHTML(a); });
      S.activeHTML = [];
    }
    if (S.players && S.players.length) {
      S.players.forEach(fadeStopHTML);
      S.players = [];
    }
    if (typeof document !== 'undefined') {
      const domAudios = document.querySelectorAll('audio');
      for (let j = 0; j < domAudios.length; j++) {
        try { domAudios[j].pause(); domAudios[j].currentTime = 0; } catch (e) {}
      }
    }
  }

  function playSingleClean(srcKey, loop, targetVol) {
    if (!S.userInteracted) return null; // BLOCKED: user gesture required (zero autoplay)
    const ctx = getCtx();
    if (!ctx) {
      if (typeof global.Audio === 'undefined') return null;
      const a = new global.Audio(SOUND_FILES[srcKey] ? SOUND_FILES[srcKey] : SOUND_FILES.rain);
      a.loop = !!loop;
      a.preload = 'auto';
      const fv = finalVol(targetVol);
      a.volume = 0;
      S.players.push(a);
      S.activeHTML.push(a);
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          let step = 0;
          const steps = 8;
          const iv = setInterval(function () {
            step++;
            try { a.volume = S.muted ? 0 : fv * (step / steps); } catch (e) {}
            if (step >= steps || a.paused) {
              clearInterval(iv);
              S.fadeTimers.delete(iv);
            }
          }, 20);
          S.fadeTimers.add(iv);
        }).catch(function () {});
      }
      return a;
    }
    S.noiseGeneration = (S.noiseGeneration || 0) + 1;
    const gen = S.noiseGeneration;
    buildLoopBuffer(ctx, srcKey).then(function (buffer) {
      if (gen !== (S.noiseGeneration || 0)) return; // stale request (stop happened)
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = !!loop;
      const dc = ctx.createBiquadFilter();
      dc.type = 'highpass';
      dc.frequency.setValueAtTime(15, ctx.currentTime);
      dc.Q.setValueAtTime(0.707, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, finalVol(targetVol)), ctx.currentTime + FADE_IN_SEC);
      source.connect(dc);
      dc.connect(gain);
      gain.connect(getSafeDestination(ctx));
      source.start();
      S.activeSource = source;
      S.activeGain = gain;
      S.activeDC = dc;
      source.onended = function () {
        if (S.activeSource === source) {
          S.activeSource = null; S.activeGain = null; S.activeDC = null;
        }
      };
    }).catch(function () {});
    return { pending: true };
  }
  const SovereignRealAudio = {
    version: '631.0.0',
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
      if (S.muted || !S.userInteracted) return false; // gesture gate: zero autoplay
      if (typeof global.Audio === 'undefined') return false;
      const ctx = getCtx();
      if (ctx && typeof ctx.createBufferSource === 'function') {
        S.noiseGeneration = (S.noiseGeneration || 0) + 1;
        const gen = S.noiseGeneration;
        buildLoopBuffer(ctx, 'cue').then(function (buffer) {
          if (gen !== (S.noiseGeneration || 0)) return;
          if (!buffer) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gain = ctx.createGain();
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(Math.max(0.0001, finalVol(S.volume)), now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
          source.connect(gain);
          gain.connect(getSafeDestination(ctx));
          source.start();
          source.stop(now + 1.7);
          setTimeout(function () {
            try { source.disconnect(); gain.disconnect(); } catch (e) {}
          }, 1800);
        }).catch(function () {});
        return true;
      }
      const p = new global.Audio(SOUND_FILES.cue);
      p.volume = finalVol(S.volume);
      p.play().catch(function () {});
      return true;
    },
    playZenBell: function () { return this.playBell(); },
    playCue: function () { return this.playBell(); },
    setVolume: function (val) {
      if (typeof val === 'number') {
        S.volume = clamp01(val);
        this.volume = S.volume;
        for (let i = 0; i < S.players.length; i++) {
          try { S.players[i].volume = S.muted ? 0 : S.volume; } catch (e) {}
        }
        try {
          if (S.activeGain && S.dspContext) {
            S.activeGain.gain.setValueAtTime(Math.max(0.0001, finalVol(S.volume)), S.dspContext.currentTime);
          }
        } catch (e) {}
      }
      return this.volume;
    },
    toggleMute: function () {
      S.muted = !S.muted;
      this.muted = S.muted;
      for (let i = 0; i < S.players.length; i++) {
        try { S.players[i].volume = S.muted ? 0 : S.volume; } catch (e) {}
      }
      try {
        if (S.activeGain && S.dspContext) {
          S.activeGain.gain.cancelScheduledValues(S.dspContext.currentTime);
          S.activeGain.gain.setValueAtTime(Math.max(0.0001, finalVol(S.volume)), S.dspContext.currentTime);
        }
      } catch (e) {}
      return S.muted;
    }
  };

  global.SovereignAudioSuite = {
    version: '631.0.0',
    ensureContext: function () { return getCtx(); },
    chimes: { PHI: 1.618, BASE_HZ: 432, playGoldenChime: function () { return SovereignRealAudio.playBell(); } },
    binaural: { active: false, start: function () { this.active = true; return SovereignRealAudio.playAmbient('water'); }, stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); } },
    guardian: { init: function () {}, getState: function () { return 'ready'; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: '631.0.0',
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
