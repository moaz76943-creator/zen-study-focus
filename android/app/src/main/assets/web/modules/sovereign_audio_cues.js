/**
 * DEEP FOCUS — Pure CC0/PD Nature Audio Engine (v626.0.0)
 * Zero Music, Zero Meditation Bells, Zero Synthetic Math Noise.
 */
(function (global) {
  "use strict";

  var SOUND_FILES = {
    rain: "audio/rain_window.ogg",
    thunder: "audio/rain_thunder.ogg",
    forest: "audio/forest_birds.ogg",
    birds: "audio/forest_birds.ogg",
    water: "audio/flowing_water.ogg",
    stream: "audio/flowing_water.ogg",
    night: "audio/forest_birds.ogg",
    wind: "audio/wind_breeze.ogg",
    cue: "audio/water_drop.ogg",
    bell: "audio/water_drop.ogg",
    brown: "audio/rain_window.ogg",
    pink: "audio/flowing_water.ogg"
  };

  var currentVolume = 0.7;
  var isMuted = false;
  var activePlayers = {};

  function createPlayer(src, loop) {
    if (typeof Audio === "undefined") return null;
    var a = new Audio(src);
    a.loop = !!loop;
    a.volume = isMuted ? 0 : currentVolume;
    a.preload = "auto";
    return a;
  }

  var SovereignRealAudio = {
    version: "626.0.0",
    volume: currentVolume,
    muted: isMuted,
    cues: {
      focus_start: { file: SOUND_FILES.cue, frequencies: [432], duration: 1.0 },
      focus_end: { file: SOUND_FILES.cue, frequencies: [528], duration: 1.2 },
      break_start: { file: SOUND_FILES.cue, frequencies: [396], duration: 1.0 }
    },
    playAmbient: function (type, vol) {
      var key = String(type || "rain").toLowerCase();
      var src = SOUND_FILES[key] || SOUND_FILES.rain;
      if (typeof vol === "number") this.setVolume(vol);
      this.stopAmbient();
      var player = createPlayer(src, true);
      if (player) {
        activePlayers.ambient = player;
        player.play().catch(function () {});
      }
      return true;
    },
    mixAmbient: function () {
      this.stopAmbient();
      var p1 = createPlayer(SOUND_FILES.rain, true);
      var p2 = createPlayer(SOUND_FILES.forest, true);
      if (p1) { p1.volume = currentVolume * 0.6; p1.play().catch(function () {}); activePlayers.ambient = p1; }
      if (p2) { p2.volume = currentVolume * 0.5; p2.play().catch(function () {}); activePlayers.mix = p2; }
      return true;
    },
    stopAmbient: function () {
      Object.keys(activePlayers).forEach(function (k) {
        try { if (activePlayers[k]) { activePlayers[k].pause(); activePlayers[k].currentTime = 0; } } catch (e) {}
      });
      activePlayers = {};
      return true;
    },
    playBell: function () {
      if (this.muted) return false;
      var p = createPlayer(SOUND_FILES.cue, false);
      if (p) p.play().catch(function () {});
      return true;
    },
    playZenBell: function () { return this.playBell(); },
    playCue: function () { return this.playBell(); },
    setVolume: function (val) {
      if (typeof val === "number") {
        currentVolume = Math.max(0.0, Math.min(1.0, val));
        this.volume = currentVolume;
        Object.keys(activePlayers).forEach(function (k) {
          if (activePlayers[k]) activePlayers[k].volume = isMuted ? 0 : currentVolume;
        });
      }
      return this.volume;
    },
    toggleMute: function () {
      isMuted = !isMuted;
      this.muted = isMuted;
      Object.keys(activePlayers).forEach(function (k) {
        if (activePlayers[k]) activePlayers[k].volume = isMuted ? 0 : currentVolume;
      });
      return this.muted;
    }
  };

  global.SovereignAudioSuite = {
    version: "626.0.0",
    ensureContext: function () { return null; },
    chimes: { PHI: 1.618, BASE_HZ: 432, playGoldenChime: function () { return SovereignRealAudio.playBell(); } },
    binaural: { active: false, start: function () { this.active = true; return SovereignRealAudio.playAmbient("water"); }, stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); } },
    guardian: { init: function () {}, getState: function () { return "ready"; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: "626.0.0",
    activeNoiseType: null,
    generateNoiseBuffer: function (type, durationSec, sampleRate) {
      return new Float32Array(Math.floor(Math.max(1, durationSec || 1) * (sampleRate || 44100)));
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
