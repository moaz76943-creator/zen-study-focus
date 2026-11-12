/**
 * DEEP FOCUS — Dual-Deck Crossfade Seamless Nature Audio Engine (v627.0.0)
 * Eliminates audible loop cuts using alternating Deck A / Deck B crossfades,
 * subtle playbackRate micro-variation (0.98x-1.02x), and organic random accents.
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
    night: "audio/wind_breeze.ogg",
    wind: "audio/wind_breeze.ogg",
    cue: "audio/water_drop.ogg",
    bell: "audio/water_drop.ogg",
    brown: "audio/rain_window.ogg",
    pink: "audio/flowing_water.ogg"
  };

  var currentVolume = 0.7;
  var isMuted = false;
  var activeDecks = [];
  var fadeIntervals = [];
  var organicTimer = null;
  var activeSessionId = 0;

  function clearTimers() {
    fadeIntervals.forEach(function (id) { clearInterval(id); });
    fadeIntervals = [];
    if (organicTimer) {
      clearTimeout(organicTimer);
      organicTimer = null;
    }
  }

  function fadeVolume(player, fromVol, toVol, durationMs, onDone) {
    if (!player) return;
    var steps = 15;
    var stepMs = Math.max(20, Math.floor(durationMs / steps));
    var currentStep = 0;
    player.volume = isMuted ? 0 : Math.max(0, Math.min(1, fromVol));
    var iv = setInterval(function () {
      currentStep++;
      var ratio = currentStep / steps;
      var v = fromVol + (toVol - fromVol) * ratio;
      try { player.volume = isMuted ? 0 : Math.max(0, Math.min(1, v)); } catch (e) {}
      if (currentStep >= steps) {
        clearInterval(iv);
        if (typeof onDone === "function") onDone();
      }
    }, stepMs);
    fadeIntervals.push(iv);
  }

  function startDualDeckLoop(src, targetVol, sessionId) {
    if (typeof Audio === "undefined") return;
    var deck = new Audio(src);
    deck.preload = "auto";
    deck.loop = false; // Managed manually via Dual-Deck Crossfade!
    try { deck.playbackRate = 0.98 + Math.random() * 0.04; } catch (e) {}
    activeDecks.push(deck);

    var handedOff = false;
    function scheduleHandoff() {
      if (handedOff || sessionId !== activeSessionId) return;
      handedOff = true;
      fadeVolume(deck, targetVol, 0, 2800, function () {
        try { deck.pause(); deck.src = ""; } catch (e) {}
      });
      startDualDeckLoop(src, targetVol, sessionId);
    }

    deck.addEventListener("timeupdate", function () {
      if (handedOff || sessionId !== activeSessionId) return;
      if (deck.duration && isFinite(deck.duration) && deck.duration > 6) {
        if (deck.currentTime >= deck.duration - 3.0) {
          scheduleHandoff();
        }
      }
    });

    deck.addEventListener("ended", function () {
      scheduleHandoff();
    });

    deck.volume = 0;
    var p = deck.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        fadeVolume(deck, 0, targetVol, 1800);
      }).catch(function () {});
    }
  }

  function scheduleOrganicAccent(accentSrc, sessionId) {
    if (sessionId !== activeSessionId || typeof Audio === "undefined") return;
    var delayMs = 19000 + Math.floor(Math.random() * 26000); // 19s to 45s random
    organicTimer = setTimeout(function () {
      if (sessionId !== activeSessionId) return;
      var accent = new Audio(accentSrc);
      var accentVol = (isMuted ? 0 : currentVolume) * (0.22 + Math.random() * 0.18);
      accent.volume = accentVol;
      try { accent.playbackRate = 0.96 + Math.random() * 0.08; } catch (e) {}
      activeDecks.push(accent);
      accent.play().catch(function () {});
      scheduleOrganicAccent(accentSrc, sessionId);
    }, delayMs);
  }

  var SovereignRealAudio = {
    version: "627.0.0",
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
      activeSessionId++;
      var sid = activeSessionId;
      startDualDeckLoop(src, currentVolume, sid);
      if (key === "rain" || key === "thunder") {
        scheduleOrganicAccent(SOUND_FILES.thunder, sid);
      } else if (key === "forest" || key === "birds") {
        scheduleOrganicAccent(SOUND_FILES.cue, sid);
      }
      return true;
    },
    mixAmbient: function () {
      this.stopAmbient();
      activeSessionId++;
      var sid = activeSessionId;
      startDualDeckLoop(SOUND_FILES.rain, currentVolume * 0.65, sid);
      startDualDeckLoop(SOUND_FILES.forest, currentVolume * 0.45, sid);
      scheduleOrganicAccent(SOUND_FILES.thunder, sid);
      return true;
    },
    stopAmbient: function () {
      activeSessionId++;
      clearTimers();
      activeDecks.forEach(function (d) {
        try { d.pause(); d.currentTime = 0; } catch (e) {}
      });
      activeDecks = [];
      return true;
    },
    playBell: function () {
      if (this.muted || typeof Audio === "undefined") return false;
      var p = new Audio(SOUND_FILES.cue);
      p.volume = currentVolume;
      p.play().catch(function () {});
      return true;
    },
    playZenBell: function () { return this.playBell(); },
    playCue: function () { return this.playBell(); },
    setVolume: function (val) {
      if (typeof val === "number") {
        currentVolume = Math.max(0.0, Math.min(1.0, val));
        this.volume = currentVolume;
        activeDecks.forEach(function (d) {
          try { d.volume = isMuted ? 0 : currentVolume; } catch (e) {}
        });
      }
      return this.volume;
    },
    toggleMute: function () {
      isMuted = !isMuted;
      this.muted = isMuted;
      activeDecks.forEach(function (d) {
        try { d.volume = isMuted ? 0 : currentVolume; } catch (e) {}
      });
      return this.muted;
    }
  };

  global.SovereignAudioSuite = {
    version: "627.0.0",
    ensureContext: function () { return null; },
    chimes: { PHI: 1.618, BASE_HZ: 432, playGoldenChime: function () { return SovereignRealAudio.playBell(); } },
    binaural: { active: false, start: function () { this.active = true; return SovereignRealAudio.playAmbient("water"); }, stop: function () { this.active = false; return SovereignRealAudio.stopAmbient(); } },
    guardian: { init: function () {}, getState: function () { return "ready"; } },
    visualizer: { getSpectrumBins: function () { return [32, 48, 64, 48, 32, 24, 16, 12]; } }
  };

  global.SovereignAmbientDSP = {
    version: "627.0.0",
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
