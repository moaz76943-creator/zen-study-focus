/**
 * DEEP FOCUS — Sovereign Modular Audio Suite (v559.0.0)
 * Pure Web Audio API DSP (Zero .mp3/.wav/.ogg/.flac/.m4a files, Zero RECORD_AUDIO).
 * Encapsulates:
 *   - SovereignChimes (Fibonacci 432Hz Golden Ratio procedural chimes)
 *   - SovereignBinauralAlpha (10Hz Alpha focus wave synthesis)
 *   - SovereignAudioGuardian (Auto-resume after call/Bluetooth/visibility)
 *   - SovereignAudioVisualizer (Zero-permission AnalyserNode spectrum)
 */
(function (global) {
  'use strict';

  var sharedCtx = null;
  var masterGain = null;
  var analyserNode = null;

  function ensureContext() {
    var AudioCtx = global.AudioContext || global.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedCtx) {
      sharedCtx = new AudioCtx();
      masterGain = sharedCtx.createGain();
      masterGain.gain.value = 0.65;
      analyserNode = sharedCtx.createAnalyser();
      analyserNode.fftSize = 64;
      masterGain.connect(analyserNode);
      analyserNode.connect(sharedCtx.destination);
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(function () {});
    }
    return sharedCtx;
  }

  var SovereignChimes = {
    PHI: 1.61803398875,
    BASE_HZ: 432,
    playGoldenChime: function (tier) {
      var ctx = ensureContext();
      if (!ctx || !masterGain) return false;
      var now = ctx.currentTime;
      var steps = tier === 'complete' ? [1, this.PHI, 2, this.PHI * 2] : [1, this.PHI];
      steps.forEach(function (ratio, idx) {
        var osc = ctx.createOscillator();
        var env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432 * ratio, now + idx * 0.14);
        env.gain.setValueAtTime(0.0001, now + idx * 0.14);
        env.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.04);
        env.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.9);
        osc.connect(env);
        env.connect(masterGain);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.95);
      });
      return true;
    }
  };

  var SovereignBinauralAlpha = {
    active: false,
    leftOsc: null,
    rightOsc: null,
    gainNode: null,
    start: function (baseFreq, beatHz) {
      var ctx = ensureContext();
      if (!ctx || !masterGain || this.active) return false;
      var f0 = typeof baseFreq === 'number' ? baseFreq : 200;
      var beat = typeof beatHz === 'number' ? beatHz : 10;
      var merger = ctx.createChannelMerger(2);
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 1.2);

      this.leftOsc = ctx.createOscillator();
      this.rightOsc = ctx.createOscillator();
      this.leftOsc.type = 'sine';
      this.rightOsc.type = 'sine';
      this.leftOsc.frequency.value = f0;
      this.rightOsc.frequency.value = f0 + beat;

      this.leftOsc.connect(merger, 0, 0);
      this.rightOsc.connect(merger, 0, 1);
      merger.connect(this.gainNode);
      this.gainNode.connect(masterGain);

      this.leftOsc.start();
      this.rightOsc.start();
      this.active = true;
      return true;
    },
    stop: function () {
      if (!this.active) return false;
      try {
        if (this.leftOsc) this.leftOsc.stop();
        if (this.rightOsc) this.rightOsc.stop();
        if (this.gainNode) this.gainNode.disconnect();
      } catch (e) {}
      this.leftOsc = null;
      this.rightOsc = null;
      this.gainNode = null;
      this.active = false;
      return true;
    }
  };

  var SovereignAudioGuardian = {
    initialized: false,
    init: function () {
      if (this.initialized) return;
      this.initialized = true;
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible' && sharedCtx && sharedCtx.state === 'suspended') {
            sharedCtx.resume().catch(function () {});
          }
        });
      }
      if (typeof global.addEventListener === 'function') {
        global.addEventListener('focus', function () {
          if (sharedCtx && sharedCtx.state === 'suspended') {
            sharedCtx.resume().catch(function () {});
          }
        });
      }
    },
    getState: function () {
      return sharedCtx ? sharedCtx.state : 'uninitialized';
    }
  };

  var SovereignAudioVisualizer = {
    getSpectrumBins: function () {
      if (!analyserNode) return [];
      var data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      return Array.prototype.slice.call(data, 0, 16);
    }
  };

  SovereignAudioGuardian.init();

  var AudioSuite = {
    version: '559.0.0',
    ensureContext: ensureContext,
    chimes: SovereignChimes,
    binaural: SovereignBinauralAlpha,
    guardian: SovereignAudioGuardian,
    visualizer: SovereignAudioVisualizer
  };

  // Expose modular namespace & preserve backward-compatible globals
  global.SovereignAudioSuite = AudioSuite;
  if (!global.SovereignChimes) global.SovereignChimes = SovereignChimes;
  if (!global.SovereignBinauralAlpha) global.SovereignBinauralAlpha = SovereignBinauralAlpha;
  if (!global.SovereignAudioGuardian) global.SovereignAudioGuardian = SovereignAudioGuardian;
  if (!global.SovereignAudioVisualizer) global.SovereignAudioVisualizer = SovereignAudioVisualizer;

  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_audio_suite', AudioSuite);
  }
})(typeof window !== 'undefined' ? window : globalThis);
