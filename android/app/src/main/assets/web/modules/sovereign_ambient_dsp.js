/**
 * DEEP FOCUS — SovereignAmbientDSP (v580.0.0)
 * Mathematical real-time synthesis of Brown Noise, Pink Noise, and White Noise.
 * Operates purely via Web Audio API without relying on any external audio files.
 */
(function (global) {
  'use strict';

  var activeType = null;
  var currentSource = null;
  var gainNode = null;
  var currentVolume = 0.5;

  var SovereignAmbientDSP = {
    version: '580.0.0',

    /**
     * Synthesizes mathematical noise buffers with 32-bit floating point precision
     * @param {string} type - 'brown' | 'pink' | 'white'
     * @param {number} durationSec - default 5 seconds looped
     * @param {number} sampleRate - default 44100 Hz
     */
    generateNoiseBuffer: function (type, durationSec, sampleRate) {
      var sec = Math.max(1, durationSec || 5);
      var rate = sampleRate || 44100;
      var totalSamples = Math.floor(sec * rate);
      var buffer = new Float32Array(totalSamples);

      var noiseType = String(type || 'brown').toLowerCase();

      if (noiseType === 'brown') {
        // Leaky integration of white noise (Brownian / Red Noise, 6dB/octave falloff)
        var lastOut = 0.0;
        for (var i = 0; i < totalSamples; i++) {
          var white = Math.random() * 2 - 1;
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          buffer[i] = lastOut * 3.5; // Gain normalized
          if (buffer[i] > 1.0) buffer[i] = 1.0;
          if (buffer[i] < -1.0) buffer[i] = -1.0;
        }
      } else if (noiseType === 'pink') {
        // Paul Kellet's filtered pink noise generator (-3dB/octave falloff)
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var j = 0; j < totalSamples; j++) {
          var w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          buffer[j] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
          if (buffer[j] > 1.0) buffer[j] = 1.0;
          if (buffer[j] < -1.0) buffer[j] = -1.0;
        }
      } else {
        // Pure White Noise
        for (var k = 0; k < totalSamples; k++) {
          buffer[k] = (Math.random() * 2 - 1) * 0.5;
        }
      }

      return buffer;
    },

    playNoise: function (type, volume) {
      activeType = String(type || 'brown').toLowerCase();
      if (typeof volume === 'number') {
        currentVolume = Math.max(0, Math.min(1, volume));
      }

      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        try {
          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!global.__dfAudioCtx) {
            global.__dfAudioCtx = new AudioCtx();
          }
          var ctx = global.__dfAudioCtx;
          if (ctx.state === 'suspended') {
            ctx.resume();
          }

          this.stopNoise();

          var pcm = this.generateNoiseBuffer(activeType, 4, ctx.sampleRate);
          var audioBuffer = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
          audioBuffer.getChannelData(0).set(pcm);

          currentSource = ctx.createBufferSource();
          currentSource.buffer = audioBuffer;
          currentSource.loop = true;

          gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(currentVolume, ctx.currentTime);

          currentSource.connect(gainNode);
          gainNode.connect(ctx.destination);
          currentSource.start(0);
        } catch (e) {}
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('ambient:started', { type: activeType, volume: currentVolume });
      }
      return true;
    },

    stopNoise: function () {
      if (currentSource) {
        try {
          currentSource.stop(0);
          currentSource.disconnect();
        } catch (e) {}
        currentSource = null;
      }
      var prev = activeType;
      activeType = null;
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function' && prev) {
        global.SovereignEventBus.emit('ambient:stopped', { previousType: prev });
      }
      return true;
    },

    getActiveNoiseType: function () {
      return activeType;
    },

    setVolume: function (vol) {
      currentVolume = Math.max(0, Math.min(1, vol));
      if (gainNode && global.__dfAudioCtx) {
        try {
          gainNode.gain.setValueAtTime(currentVolume, global.__dfAudioCtx.currentTime);
        } catch (e) {}
      }
      return currentVolume;
    }
  };

  global.SovereignAmbientDSP = SovereignAmbientDSP;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_ambient_dsp', SovereignAmbientDSP);
  }
})(typeof window !== 'undefined' ? window : globalThis);
