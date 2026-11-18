/**
 * DEEP FOCUS — Exhaustive 3D Spatial Acoustic Studio & 10-Band Parametric EQ
 * Module: modules/audio/spatial_acoustic_studio.js
 * Version: v451.0.0
 *
 * Zero-static procedural synthesis engine. Every sound source is a pre-rendered
 * AudioBuffer played through BufferSourceNode — no oscillators, no
 * ScriptProcessor, no live noise generators left running.
 *
 *   1. Paul Kellet 6-pole pink noise (pre-rendered buffer)
 *   2. Rain on glass (pre-rendered buffer + fixed biquad shaping)
 *   3. Ocean shoreline (brownian rumble with the swell baked into the buffer)
 *   4. 40Hz gamma binaural beat (216Hz L / 256Hz R baked into a stereo buffer)
 *   5. 10-band parametric EQ (31Hz … 16kHz)
 *   6. Analyser-backed visualiser
 *   7. Master safety ceiling (-6dB) + instant stop with click-free fade
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcousticStudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_EQ_KEY = 'df_acoustic_eq_state_v1';
  const EQ_FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  // Use AudioCore constants
  const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;
  const LIMITER_LINEAR = audioCore ? audioCore.LIMITER_LINEAR : Math.pow(10, -6.0 / 20);
  const FADE_OUT_SEC = audioCore ? audioCore.FADE_OUT_MS / 1000 : 0.03;
  const XFADE_MS = audioCore ? audioCore.XFADE_MS : 20;
  const DC_BLOCK_HZ = audioCore ? audioCore.DC_BLOCK_HZ : 15;
  const BROWN_POLE = audioCore ? audioCore.BROWN_POLE : 0.997;
  const BROWN_GAIN = audioCore ? audioCore.BROWN_GAIN : 0.4;
  const WHITE_NOISE_AMP = audioCore ? audioCore.WHITE_NOISE_AMP : 0.06;
  const PINK_NOISE_AMP = audioCore ? audioCore.PINK_NOISE_AMP : 0.08;

  class AcousticStudio {
    constructor(options = {}) {
      this.options = Object.assign({
        defaultVolume: 0.5,
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.audioCtx = null;
      this.isPlaying = false;
      this.activePreset = 'pink_noise';
      this.masterGain = null;
      this.eqFilters = [];
      this.sourceNode = null;
      this.analyser = null;
      // Gesture detection is handled by AudioCore - no local binding needed

      this.eqGains = new Array(EQ_FREQUENCIES.length).fill(0);
      this.loadSavedEq();
    }

    /** Audio may only begin after a real user gesture (no autoplay on load/tab switch). */
    bindGestureUnlock() {
      // Delegated to AudioCore.bindGesture() - no-op here
    }

    initAudioContext() {
      if (this.audioCtx) return this.audioCtx;

      // Use AudioCore's shared context - this is the ONLY path
      if (audioCore) {
        this.audioCtx = audioCore.getContext();
        if (this.audioCtx) {
          // Build our EQ chain into AudioCore's master chain
          this.buildEqChain(this.audioCtx);
          return this.audioCtx;
        }
      }

      // If AudioCore is not available, audio cannot work
      throw new Error('AudioCore not available - Web Audio requires AudioCore singleton');
    }

    buildEqChain(ctx) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.options.defaultVolume * LIMITER_LINEAR,
        ctx.currentTime
      );

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // DC-blocking high-pass filter (15Hz) to protect transducer coils from infrasonic content
      this.dcBlockFilter = ctx.createBiquadFilter();
      this.dcBlockFilter.type = 'highpass';
      this.dcBlockFilter.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
      this.dcBlockFilter.Q.setValueAtTime(0.707, ctx.currentTime);

      this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = ctx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.4, ctx.currentTime);
        }
        filter.frequency.setValueAtTime(freq, ctx.currentTime);
        filter.gain.setValueAtTime(this.eqGains[idx], ctx.currentTime);
        return filter;
      });

      // Chain: DC block -> EQ filters -> master gain -> analyser -> AudioCore master output
      this.dcBlockFilter.connect(this.eqFilters[0]);
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }

      this.eqFilters[this.eqFilters.length - 1].connect(this.masterGain);
      this.masterGain.connect(this.analyser);

      // Connect to AudioCore's master output (which goes through limiter → DC → destination)
      const masterOut = audioCore ? audioCore.getMasterOutput() : ctx.destination;
      this.analyser.connect(masterOut);
    }

    /** Paul Kellet pink-noise, pre-rendered, bounded well under the limiter. */
  generatePinkNoiseBuffer(durationSec = 5) {
    const ctx = this.initAudioContext();
    if (!audioCore || !audioCore.createSeamlessBuffer) return null;
    return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
      const data = channelData[0];
      const bufferSize = Math.floor(sampleRate * totalSec);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        b6 = white * 0.115926;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] = pink * PINK_NOISE_AMP;
      }
      // AudioCore's createSeamlessBuffer handles DC removal, normalization, clamp
    }, 1);
  }

  /** Rain: quiet white bed, all spectral shaping done by the biquad chain. */
  generateRainBuffer(durationSec = 5) {
    const ctx = this.initAudioContext();
    if (!audioCore || !audioCore.createSeamlessBuffer) return null;
    return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
      const data = channelData[0];
      const bufferSize = Math.floor(sampleRate * totalSec);
      let peak = 0;
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * WHITE_NOISE_AMP;
        const absV = Math.abs(data[i]);
        if (absV > peak) peak = absV;
      }
      // AudioCore's createSeamlessBuffer handles DC removal, normalization, clamp
    }, 1);
  }

  /**
   * Ocean: brownian rumble with the shoreline swell baked directly into the
   * buffer, so no LFO node has to be kept alive. Zero-static version.
   * Uses a bounded leaky-integrator of white noise: no DC drift,
   * no clipping static, peak-normalized below the limiter ceiling.
   */
  generateOceanBuffer(durationSec = 5) {
    const ctx = this.initAudioContext();
    if (!audioCore || !audioCore.createSeamlessBuffer) return null;
    return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
      const data = channelData[0];
      const bufferSize = Math.floor(sampleRate * totalSec);

      // Swell frequency chosen so integer cycles fit in buffer duration
      // 0.2 Hz = 1 cycle per 5s, 0.4 Hz = 2 cycles per 5s, etc.
      // Using 0.2 Hz ensures perfect loop continuity of the amplitude envelope.
      const swellHz = 0.2;
      // Brown noise: leaky integrator of WHITE noise (-6dB/oct slope).
      // Integrating the Kellet pink signal doubled the infrasonic weight
      // into a constant pressure rumble that bled through the loop as hiss.
      let brownAccum = 0;
      let peak = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Leaky integrator: bounded DC, no drift
        brownAccum = BROWN_POLE * brownAccum + white * BROWN_GAIN; // AudioCore's BROWN_POLE & BROWN_GAIN
        const t = i / sampleRate;
        // 0.55..1.0 swell, keeps the noise well below the limiter ceiling.
        const swell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(2 * Math.PI * swellHz * t));
        const v = brownAccum * 0.8 * swell;
        data[i] = v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      // Peak normalize handled by createSeamlessBuffer
    }, 1);
  }

  /** 40Hz gamma binaural beat baked into a stereo buffer (216Hz L, 256Hz R). */
  generateBinaural40HzBuffer(durationSec = 5) {
    const ctx = this.initAudioContext();
    if (!audioCore || !audioCore.createSeamlessBuffer) return null;
    // Ensure duration contains integer cycles of both 216Hz and 256Hz
    // LCM of periods: 216 and 256 -> 216=2^3*3^3, 256=2^8 -> LCM=2^8*3^3=6912
    // Fundamental period = 6912/216 = 32 seconds for 216Hz, 6912/256 = 27 seconds for 256Hz
    // For 5 seconds: 216*5=1080 cycles (integer), 256*5=1280 cycles (integer) - perfect!
    return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
      const left = channelData[0];
      const right = channelData[1];
      const bufferSize = Math.floor(sampleRate * totalSec);

      const amp = 0.18;
      const TWO_PI = Math.PI * 2;
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        left[i] = Math.sin(TWO_PI * 216 * t) * amp;
        right[i] = Math.sin(TWO_PI * 256 * t) * amp;
      }
      // AudioCore's createSeamlessBuffer handles clamp
    }, 2);
  }

    startPreset(presetName = 'pink_noise') {
      if (!audioCore || !audioCore.isGestureReceived()) {
        return { preset: this.activePreset, isPlaying: false, reason: 'user_gesture_required' };
      }

      this.initAudioContext();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.stop();
      this.activePreset = presetName;
      this.isPlaying = true;

      if (presetName === 'rain') {
        this.createRainSoundscape();
      } else if (presetName === 'ocean') {
        this.createOceanWavesSoundscape();
      } else if (presetName === 'binaural_40hz') {
        this.create40HzBinauralBeat();
      } else {
        this.createPinkNoiseSource();
      }

      return {
        preset: this.activePreset,
        isPlaying: this.isPlaying,
        sampleRate: this.audioCtx.sampleRate
      };
    }

    /** Start a looping buffer source through an optional shaping chain. */
    _startBufferSource(buffer, shapers) {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      if (shapers && shapers.length) {
        source.connect(shapers[0]);
        for (let i = 0; i < shapers.length - 1; i++) {
          shapers[i].connect(shapers[i + 1]);
        }
        shapers[shapers.length - 1].connect(this.dcBlockFilter);
      } else {
        source.connect(this.dcBlockFilter);
      }

      source.start();
      this.sourceNode = source;
      return source;
    }

    createPinkNoiseSource() {
      this._startBufferSource(this.generatePinkNoiseBuffer(5), null);
    }

    createRainSoundscape() {
      const ctx = this.audioCtx;
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(600, ctx.currentTime);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200, ctx.currentTime);
      bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

      this._startBufferSource(this.generateRainBuffer(5), [highpass, bandpass]);
    }

    createOceanWavesSoundscape() {
      this._startBufferSource(this.generateOceanBuffer(5), null);
    }

    create40HzBinauralBeat() {
      this._startBufferSource(this.generateBinaural40HzBuffer(5), null);
    }

    /** Instant stop with a 30ms click-free fade, tears down every node. */
    stop() {
      this.isPlaying = false;

      if (this.sourceNode) {
        const source = this.sourceNode;
        this.sourceNode = null;
        try {
          const now = this.audioCtx.currentTime;
          const fade = FADE_OUT_SEC;
          const fadeGain = this.audioCtx.createGain();
          fadeGain.gain.setValueAtTime(1, now);
          fadeGain.gain.linearRampToValueAtTime(0, now + fade);
          source.disconnect();
          source.connect(fadeGain);
          fadeGain.connect(this.eqFilters[0]);
          source.stop(now + fade + 0.005);
        } catch (e) {
          try { source.stop(); } catch (_) {}
          try { source.disconnect(); } catch (_) {}
        }
      }

      return { active: false };
    }

    setEqBandGain(bandIndex, gainDb) {
      const idx = parseInt(bandIndex, 10);
      const gain = Math.max(-12, Math.min(12, parseFloat(gainDb) || 0));

      if (idx >= 0 && idx < this.eqGains.length) {
        this.eqGains[idx] = gain;
        if (this.eqFilters && this.eqFilters[idx]) {
          this.eqFilters[idx].gain.setValueAtTime(gain, this.audioCtx ? this.audioCtx.currentTime : 0);
        }
        this.saveEq();
      }
      return this.eqGains;
    }

    /** Master volume 0..1, always scaled by the -6dB ceiling. */
    setMasterVolume(vol) {
      const v = Math.max(0, Math.min(1.0, parseFloat(vol) || 0));
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setValueAtTime(v * LIMITER_LINEAR, this.audioCtx.currentTime);
      }
      return v;
    }

    getWaveformData() {
      if (!this.analyser) return new Uint8Array(32);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }

    saveEq() {
      if (this.options.storage) {
        try {
          this.options.storage.setItem(STORAGE_EQ_KEY, JSON.stringify(this.eqGains));
        } catch (e) {}
      }
    }

    loadSavedEq() {
      if (this.options.storage) {
        try {
          const raw = this.options.storage.getItem(STORAGE_EQ_KEY);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length === EQ_FREQUENCIES.length) {
              this.eqGains = arr;
            }
          }
        } catch (e) {}
      }
    }
  }

  return AcousticStudio;
}));