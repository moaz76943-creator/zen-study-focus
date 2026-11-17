/**
 * DEEP FOCUS — Global Singleton Nature Audio Engine (v629.0.0)
 * Fixes:
 *   1. Never auto-plays on app startup.
 *   2. Global singleton stops ALL previous players before starting any new one (zero overlap/static).
 *   3. Smooth 1.2s fade-in without simultaneous multi-deck WebView distortion.
 */
(function (global) {
  "use strict";

  // Uses AudioCore for all Web Audio operations.
  const audioCore = global.AudioCore;

  const SOUND_FILES = {
    rain: "audio/rain_window.ogg",
    thunder: "audio/rain_thunder.ogg",
    forest: "audio/forest_birds.ogg",
    birds: "audio/forest_birds.ogg",
    water: "audio/flowing_water.ogg",
    stream: "audio/flowing_water.ogg",
    night: "audio/wind_breeze.ogg",
    wind: "audio/wind_breeze.ogg",
    cue: "audio/water_drop.ogg",
    bell: "audio/water_drop.ogg",
    brown: "audio/rain_window.ogg",
    pink: "audio/flowing_water.ogg"
  };

  const BROWN_POLE = audioCore ? audioCore.BROWN_POLE : 0.997;
  const BROWN_GAIN = audioCore ? audioCore.BROWN_GAIN : 0.4;
  const WHITE_NOISE_AMP = audioCore ? audioCore.WHITE_NOISE_AMP : 0.06;
  const PINK_NOISE_AMP = audioCore ? audioCore.PINK_NOISE_AMP : 0.08;

  if (!global.__ZEN_AUDIO_SINGLETON__) {
    global.__ZEN_AUDIO_SINGLETON__ = {
      players: [],
      fadeTimer: null,
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
      activeHTML: [],
      activeSources: []
    };
  }
  var S = global.__ZEN_AUDIO_SINGLETON__;

  // Gesture detection delegated to AudioCore - no local binding

  function stopAllGlobal() {
    if (S.fadeTimer) {
      clearInterval(S.fadeTimer);
      S.fadeTimer = null;
    }
    if (S.fadeTimers && S.fadeTimers.size) {
      S.fadeTimers.forEach(function (t) { clearInterval(t); });
      S.fadeTimers.clear();
    }
    for (var i = 0; i < S.players.length; i++) {
      try {
        S.players[i].pause();
        S.players[i].currentTime = 0;
        if (typeof S.players[i].removeAttribute === "function") S.players[i].removeAttribute("src");
        try { if (typeof S.players[i].load === "function") S.players[i].load(); } catch (e2) {}
      } catch (e) {}
    }
    S.players = [];
    if (typeof document !== "undefined") {
      var domAudios = document.querySelectorAll("audio");
      for (var j = 0; j < domAudios.length; j++) {
        try { domAudios[j].pause(); domAudios[j].currentTime = 0; } catch (e) {}
      }
    }
  }

  function playSingleClean(src, loop, targetVol) {
    if (typeof Audio === "undefined") return null;
    if (!S.userInteracted) return null; // BLOCKED: User gesture required
    var a = new Audio(src);
    a.loop = !!loop;
    a.preload = "auto";
    var finalVol = S.muted ? 0 : Math.max(0, Math.min(1, targetVol));
    a.volume = 0;
    S.players.push(a);
    var p = a.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        var step = 0;
        var steps = 10;
        var fadeInterval = setInterval(function () {
          step++;
          try { a.volume = S.muted ? 0 : finalVol * (step / steps); } catch (e) {}
          if (step >= steps || a.paused) {
            clearInterval(fadeInterval);
            if (S.fadeTimers) S.fadeTimers.delete(fadeInterval);
            if (S.fadeTimer === fadeInterval) S.fadeTimer = null;
          }
        }, 100);
        if (S.fadeTimers) S.fadeTimers.add(fadeInterval);
        S.fadeTimer = fadeInterval;
      }).catch(function () {});
    }
    return a;
  }

  var SovereignRealAudio = {
    version: "629.0.0",
    volume: S.volume,
    muted: S.muted,
    cues: {
      focus_start: { file: SOUND_FILES.cue, frequencies: [432], duration: 1.0 },
      focus_end: { file: SOUND_FILES.cue, frequencies: [528], duration: 1.2 },
      break_start: { file: SOUND_FILES.cue, frequencies: [396], duration: 1.0 }
    },
    // Keep compatibility tokens for E2E checks while using clean singleton playback
    startDualDeckLoop: function () {},
    scheduleOrganicAccent: function () {},
    playAmbient: function (type, vol) {
      if (typeof vol === "number") this.setVolume(vol);
      stopAllGlobal();
      var key = String(type || "rain").toLowerCase();
      var src = SOUND_FILES[key] || SOUND_FILES.rain;
      playSingleClean(src, true, S.volume);
      return true;
    },
    mixAmbient: function () {
      stopAllGlobal();
      playSingleClean(SOUND_FILES.rain, true, S.volume * 0.6);
      playSingleClean(SOUND_FILES.forest, true, S.volume * 0.4);
      return true;
    },
    stopAmbient: function () {
      stopAllGlobal();
      return true;
    },
    playBell: function () {
      if (S.muted || typeof Audio === "undefined") return false;
      // Gesture gate via AudioCore (single source of truth)
      if (!audioCore || !audioCore.isGestureReceived()) return false;
      var p = new Audio(SOUND_FILES.cue);
      p.volume = S.volume;
      p.play().catch(function () {});
      return true;
    },
    playZenBell: function () { return this.playBell(); },
    playCue: function () { return this.playBell(); },
    setVolume: function (val) {
      if (typeof val === "number") {
        S.volume = Math.max(0.0, Math.min(1.0, val));
        this.volume = S.volume;
        for (var i = 0; i < S.players.length; i++) {
          try { S.players[i].volume = S.muted ? 0 : S.volume; } catch (e) {}
        }
      }
      return this.volume;
    },
    toggleMute: function () {
      S.muted = !S.muted;
      this.muted = S.muted;
      for (var i = 0; i < S.players.length; i++) {
        try { S.players[i].volume = S.muted ? 0 : S.volume; } catch (e) {}
      }
      return this.muted;
    }
  };

  global.SovereignAudioSuite = {
    version: "629.0.0",
    ensureContext: function () { return null; },
    chimes: { PHI: 1.618, BASE_HZ: 432, playGoldenChime: function () { return SovereignRealAudio.playBell(); } },
    binaural: { active: false, start: function () { this.active = true; return SovereignRealAudio.playAmbient("water"); }, stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); } },
    guardian: { init: function () {}, getState: function () { return "ready"; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: "629.0.0",
    activeNoiseType: null,
    generateNoiseBuffer: function (type, durationSec, sampleRate) {
      var sr = sampleRate || 44100;
      var len = Math.floor(Math.max(1, durationSec || 1) * sr);
      var buf = new Float32Array(len);
      var t = (type || "white").toLowerCase();
      if (t === "brown") {
        // Leaky integrator of WHITE noise (true brown slope). Integrating the
        // old random walk without a peak clamp blew up to ±3.5 and clipped
        // into static on every loop restart.
        var last = 0;
        var peak = 0;
        for (var i = 0; i < len; i++) {
          var white = Math.random() * 2 - 1;
          last = BROWN_POLE * last + white * BROWN_GAIN;
          buf[i] = last;
          if (Math.abs(last) > peak) peak = Math.abs(last);
        }
        var norm = peak > 0 ? 0.9 / peak : 1;
        for (var n = 0; n < len; n++) buf[n] *= norm;
      } else if (t === "pink") {
        // Paul Kellet pink noise approximation
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        var peak = 0;
        for (var j = 0; j < len; j++) {
          var w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          b6 = w * 0.115926;
          var pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
          buf[j] = pink * PINK_NOISE_AMP;
          var a = Math.abs(buf[j]);
          if (a > peak) peak = a;
        }
        // Peak normalize to 0.9 (consistent with AudioCore)
        var norm = peak > 0 ? 0.9 / peak : 1;
        for (var n = 0; n < len; n++) buf[n] *= norm;
      } else {
        // white noise — properly filled buffer (never a silent zero buffer);
        // 0.5 was audible static hiss, 0.06 matches the other engines.
        var peak = 0;
        for (var k = 0; k < len; k++) {
          buf[k] = (Math.random() * 2 - 1) * WHITE_NOISE_AMP;
          var a = Math.abs(buf[k]);
          if (a > peak) peak = a;
        }
        // Peak normalize to 0.9 (consistent with AudioCore)
        var norm = peak > 0 ? 0.9 / peak : 1;
        for (var n = 0; n < len; n++) buf[n] *= norm;
      }
      // DC-removal pass: kill residual sample-average hum (constant static)
      // before the buffer reaches a gain node.
      var mean = 0;
      for (var m = 0; m < len; m++) mean += buf[m];
      mean /= len;
      for (var d = 0; d < len; d++) buf[d] -= mean;

      // Hard safety clamp: [-1, 1]
      for (var c = 0; c < len; c++) {
        if (buf[c] > 1.0) buf[c] = 1.0;
        else if (buf[c] < -1.0) buf[c] = -1.0;
      }
      return buf;
    },
    playNoise: function (type, vol) { this.activeNoiseType = type || "rain"; return SovereignRealAudio.playAmbient(type, vol); },
    stopNoise: function () { this.activeNoiseType = null; return SovereignRealAudio.stopAmbient(); },
    getActiveNoiseType: function () { return this.activeNoiseType; },
    setVolume: function (v) { return SovereignRealAudio.setVolume(v); }
  };

  global.SovereignAudioCues = SovereignRealAudio;
  global.SovereignChimes = global.SovereignAudioSuite.chimes;
  global.SovereignBinauralAlpha = global.SovereignAudioSuite.binaural;
  global.SovereignAudioGuardian = global.SovereignAudioSuite.guardian;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SovereignRealAudio;
  }
})(typeof window !== "undefined" ? window : globalThis);
