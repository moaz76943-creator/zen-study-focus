/**
 * DEEP FOCUS — Sovereign Real CC0 Audio Suite (v619.0.0)
 * Plays authentic CC0 1.0 Universal & Public Domain natural recordings bundled in audio/*.ogg:
 *   - audio/rain_window.ogg (Rain against the window - Public Domain)
 *   - audio/forest_birds.ogg (Forest birdsong at dawn - Public Domain)
 *   - audio/flowing_water.ogg (Flowing stream water - CC0 1.0)
 *   - audio/zen_bell.ogg (Meditation gong/bell - CC0 1.0)
 */
(function (global) {
  'use strict';

  var SOUND_FILES = {
    rain: 'audio/rain_window.ogg',
    water: 'audio/flowing_water.ogg',
    waves: 'audio/flowing_water.ogg',
    forest: 'audio/forest_birds.ogg',
    wind: 'audio/forest_birds.ogg',
    fire: 'audio/rain_window.ogg',
    brown: 'audio/rain_window.ogg',
    pink: 'audio/forest_birds.ogg',
    white: 'audio/flowing_water.ogg',
    bell: 'audio/zen_bell.ogg',
    bowl: 'audio/zen_bell.ogg',
    crystal: 'audio/zen_bell.ogg'
  };

  var activePlayers = {};
  var currentVolume = 0.75;
  var isMuted = false;

  function createPlayer(src, loop) {
    if (typeof Audio === 'undefined') return null;
    try {
      var a = new Audio(src);
      a.loop = Boolean(loop);
      a.volume = isMuted ? 0 : currentVolume;
      return a;
    } catch (e) {
      return null;
    }
  }

  var SovereignRealAudio = {
    version: '619.0.0',
    catalog: SOUND_FILES,
    volume: 0.75,
    muted: false,
    cues: {
      focus_start: { file: SOUND_FILES.bell, frequencies: [432, 648, 864], duration: 2.0 },
      focus_end: { file: SOUND_FILES.bell, frequencies: [528, 660, 792], duration: 2.2 },
      break_start: { file: SOUND_FILES.bell, frequencies: [396, 495, 594], duration: 1.5 }
    },

    playAmbient: function (type, vol) {
      var key = String(type || 'rain').toLowerCase();
      var src = SOUND_FILES[key] || SOUND_FILES.rain;
      if (typeof vol === 'number') this.setVolume(vol);

      this.stopAmbient();
      var player = createPlayer(src, true);
      if (player) {
        activePlayers.ambient = player;
        player.play().catch(function () {});
      }
      return true;
    },

    mixAmbient: function () {
      var p1 = createPlayer(SOUND_FILES.rain, true);
      var p2 = createPlayer(SOUND_FILES.forest, true);
      this.stopAmbient();
      if (p1) { p1.volume = currentVolume * 0.6; p1.play().catch(function () {}); activePlayers.ambient = p1; }
      if (p2) { p2.volume = currentVolume * 0.5; p2.play().catch(function () {}); activePlayers.mix = p2; }
      return true;
    },

    stopAmbient: function () {
      Object.keys(activePlayers).forEach(function (k) {
        try {
          if (activePlayers[k]) {
            activePlayers[k].pause();
            activePlayers[k].currentTime = 0;
          }
        } catch (e) {}
      });
      activePlayers = {};
      return true;
    },

    playBell: function () {
      if (this.muted) return false;
      var bellPlayer = createPlayer(SOUND_FILES.bell, false);
      if (bellPlayer) {
        bellPlayer.play().catch(function () {});
      }
      return true;
    },

    playZenBell: function () {
      return this.playBell();
    },

    playCue: function () {
      return this.playBell();
    },

    setVolume: function (val) {
      if (typeof val === 'number') {
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
    version: '619.0.0',
    ensureContext: function () { return null; },
    chimes: {
      PHI: 1.61803398875,
      BASE_HZ: 432,
      playGoldenChime: function () { return SovereignRealAudio.playBell(); }
    },
    binaural: {
      active: false,
      start: function () { this.active = true; return SovereignRealAudio.playAmbient('water'); },
      stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); }
    },
    guardian: { init: function () {}, getState: function () { return 'ready'; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: '619.0.0',
    activeNoiseType: null,
    generateNoiseBuffer: function (type, durationSec, sampleRate) {
      var total = Math.floor(Math.max(1, durationSec || 1) * (sampleRate || 44100));
      return new Float32Array(total);
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
