/**
 * DEEP FOCUS — Exhaustive 3D Spatial Acoustic Studio & 10-Band Parametric EQ
 * Module: modules/audio/spatial_acoustic_studio.js
 * Version: v452.0.0
 *
 * Zero-static procedural synthesis engine. Every sound source is a pre-rendered
 * AudioBuffer played through BufferSourceNode — no oscillators, no
 * ScriptProcessor, no live noise generators left running.
 *
 *   1. Paul Kellet 6-pole pink noise (pre-rendered buffer)
 *   2. Rain on glass (pre-rendered buffer + fixed biquad shaping)
 *   3. Ocean shoreline (brownian rumble with the swell baked into the buffer)
 *   4. Binaural beats: 40Hz Gamma, 10Hz Alpha, 6Hz Theta, 15Hz Beta (baked into stereo buffers)
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

  // Binaural beat presets: { leftHz, rightHz, beatHz, carrierHz, durationSec }
  // Duration chosen so both left and right frequencies complete integer cycles
  // to avoid loop-boundary clicks (phase continuity at wrap).
  const BINAURAL_PRESETS = {
    gamma_40hz: { leftHz: 216, rightHz: 256, beatHz: 40, carrierHz: 236, durationSec: 5 },   // 216*5=1080, 256*5=1280 (integers)
    alpha_10hz: { leftHz: 211, rightHz: 221, beatHz: 10, carrierHz: 216, durationSec: 5 },   // 211*5=1055, 221*5=1105 (integers)
    theta_6hz:  { leftHz: 191, rightHz: 197, beatHz: 6,  carrierHz: 194, durationSec: 5 },   // 191*5=955,  197*5=985  (integers)
    beta_15hz:  { leftHz: 242, rightHz: 257, beatHz: 15, carrierHz: 249.5, durationSec: 5 }, // 242*5=1210, 257*5=1285 (integers)
  };

  const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;
  const FADE_OUT_SEC = audioCore ? audioCore.FADE_OUT_MS / 1000 : 0.03;
  const XFADE_MS = audioCore ? audioCore.XFADE_MS : 20;
  const DC_BLOCK_HZ = (audioCore && audioCore.DC_BLOCK_HZ) ? audioCore.DC_BLOCK_HZ : 40;
  const BROWN_POLE = audioCore ? audioCore.BROWN_POLE : 0.997;
  const BROWN_GAIN = audioCore ? audioCore.BROWN_GAIN : 0.4;
  const WHITE_NOISE_AMP = audioCore ? audioCore.WHITE_NOISE_AMP : 0.06;
  const PINK_NOISE_AMP = audioCore ? audioCore.PINK_NOISE_AMP : 0.08;
  const BROWN_NOISE_AMP = audioCore ? audioCore.BROWN_NOISE_AMP : 0.03;

  class AcousticStudio {
    constructor(options = {}) {
      this.options = Object.assign({
        defaultVolume: 0.5,
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.audioCtx = null;
      this.isPlaying = false;
      this.activePreset = 'pink_noise';
      this.eqFilters = [];
      this.sourceNode = null;
      this.analyser = null;
      this.dcBlockFilter = null;
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
      // Use AudioCore's master output directly — no local masterGain to avoid double attenuation
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // DC-blocking high-pass filter (40 Hz — protects transducer coils & brown noise rumble)
      this.dcBlockFilter = ctx.createBiquadFilter();
      this.dcBlockFilter.type = 'highpass';
      this.dcBlockFilter.frequency.setValueAtTime(DC_BLOCK_HZ, ctx.currentTime);
      this.dcBlockFilter.Q.setValueAtTime(0.707, ctx.currentTime);

      // Spatial/HRTF panner node for 3D positioning
      this.spatialPanner = ctx.createPanner();
      this.spatialPanner.panningModel = 'HRTF';
      this.spatialPanner.distanceModel = 'exponential';
      this.spatialPanner.refDistance = 1;
      this.spatialPanner.maxDistance = 10000;
      this.spatialPanner.rolloffFactor = 1;
      this.spatialPanner.coneInnerAngle = 360;
      this.spatialPanner.coneOuterAngle = 360;
      this.spatialPanner.coneOuterGain = 0;

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

      // Chain: DC block -> Spatial Panner -> EQ filters -> AudioCore master output (masterGain -> limiter -> DC -> analyser -> destination)
      this.dcBlockFilter.connect(this.spatialPanner);
      this.spatialPanner.connect(this.eqFilters[0]);
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }

      // Connect last EQ filter to AudioCore's master output (masterGain)
      const masterOut = audioCore ? audioCore.getMasterOutput() : ctx.destination;
      this.eqFilters[this.eqFilters.length - 1].connect(masterOut);

      // Also connect analyser for visualization (taps the signal post-EQ)
      this.eqFilters[this.eqFilters.length - 1].connect(this.analyser);
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
      }, 1, false);
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
      }, 1, false);
    }

  /**
   /** Ocean: brownian rumble with the shoreline swell baked directly into the
      * buffer, so no LFO node has to be kept alive. Zero-static version.
      * Uses a bounded leaky-integrator of white noise: no DC drift,
      * no clipping static, peak-normalized below the limiter ceiling.
      * Uses AudioCore's improved two-pole brown noise generator for better DC rejection.
      */
     generateOceanBuffer(durationSec = 5) {
       const ctx = this.initAudioContext();
       if (!audioCore || !audioCore.createSeamlessBuffer) return null;
       return audioCore.createSeamlessBuffer(ctx, durationSec, (channelData, sampleRate, totalSec) => {
         const data = channelData[0];
         const bufferSize = Math.floor(sampleRate * totalSec);

         // Brown noise: two-pole leaky integrator of WHITE noise (-12dB/oct slope).
         // Using AudioCore's BROWN_NOISE_AMP (0.03) for consistent fixed-output scale.
         // The old *0.05 with swell modulation caused loop-boundary discontinuities
         // perceived as static/hiss. Fixed gain with AudioCore's crossfade is clean.
         let brown1 = 0;
         let brown2 = 0;
         for (let i = 0; i < bufferSize; i++) {
           const white = Math.random() * 2 - 1;
           // Two-pole leaky integrator: first pole at BROWN_POLE, second at 0.99
           brown1 = BROWN_POLE * brown1 + white * BROWN_GAIN;
           brown2 = 0.99 * brown2 + brown1 * 0.1;
           // Fixed output scale using AudioCore's BROWN_NOISE_AMP — no swell modulation,
           // no amplitude variation that breaks seamless loop crossfade.
           data[i] = brown2 * BROWN_NOISE_AMP;
         }
         // AudioCore's createSeamlessBuffer handles DC removal, clamp, and 20ms crossfade.
       }, 1, false);
     }

  /** Binaural beat baked into a stereo buffer (leftHz, rightHz). Uses AudioCore's createSeamlessBuffer for zero-click loops. */
  generateBinauralBuffer(presetKey = 'gamma_40hz') {
    const preset = BINAURAL_PRESETS[presetKey];
    if (!preset) return null;

    const ctx = this.initAudioContext();
    if (!audioCore || !audioCore.createSeamlessBuffer) return null;

    // Use createSeamlessBuffer for proper DC removal, peak limiting, clamp, and crossfade
    return audioCore.createSeamlessBuffer(ctx, preset.durationSec, (channelData, sampleRate, totalSec) => {
      const left = channelData[0];
      const right = channelData[1];
      const bufferSize = Math.floor(sampleRate * totalSec);

      const amp = 0.18;
      const TWO_PI = Math.PI * 2;
      // Sine waves have zero DC offset by construction — no DC block needed.
      // But createSeamlessBuffer will still apply DC removal, peak limiting, clamp, and crossfade for safety.
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        left[i] = Math.sin(TWO_PI * preset.leftHz * t) * amp;
        right[i] = Math.sin(TWO_PI * preset.rightHz * t) * amp;
      }
    }, 2, false);
  }

  /** @deprecated Use generateBinauralBuffer('gamma_40hz') */
  generateBinaural40HzBuffer(durationSec = 5) {
    return this.generateBinauralBuffer('gamma_40hz');
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
      } else if (presetName === 'binaural_40hz' || presetName === 'gamma_40hz') {
        this.create40HzBinauralBeat();
      } else if (presetName === 'binaural_10hz' || presetName === 'alpha_10hz') {
        this.create10HzBinauralBeat();
      } else if (presetName === 'binaural_6hz' || presetName === 'theta_6hz') {
        this.create6HzBinauralBeat();
      } else if (presetName === 'binaural_15hz' || presetName === 'beta_15hz') {
        this.create15HzBinauralBeat();
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

      // Build the chain: source -> shapers -> dcBlockFilter -> EQ filters -> AudioCore master
      let lastNode = source;
      if (shapers && shapers.length) {
        shapers.forEach(s => {
          lastNode.connect(s);
          lastNode = s;
        });
      }
      lastNode.connect(this.dcBlockFilter);
      // The EQ chain is already built and connected to AudioCore master output
      // in buildEqChain. The dcBlockFilter is the entry point to the EQ chain.
      // So we just connect source/shapers to dcBlockFilter.

      // A new preset = audible audio desired: restore AudioCore's master
      if (audioCore && typeof audioCore.unmuteMaster === 'function') {
        audioCore.unmuteMaster();
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
      this._startBufferSource(this.generateBinauralBuffer('gamma_40hz'), null);
    }

    create10HzBinauralBeat() {
      this._startBufferSource(this.generateBinauralBuffer('alpha_10hz'), null);
    }

    create6HzBinauralBeat() {
      this._startBufferSource(this.generateBinauralBuffer('theta_6hz'), null);
    }

    create15HzBinauralBeat() {
      this._startBufferSource(this.generateBinauralBuffer('beta_15hz'), null);
    }

    /** Instant stop with a 30ms click-free fade, tears down source node. */
    stop() {
      this.isPlaying = false;

      if (this.sourceNode) {
        const source = this.sourceNode;
        this.sourceNode = null;
        try {
          const now = this.audioCtx.currentTime;
          const fade = FADE_OUT_SEC;
          // Fade using a temporary gain node inserted before dcBlockFilter
          // to avoid modifying the shared EQ chain.
          const fadeGain = this.audioCtx.createGain();
          fadeGain.gain.setValueAtTime(1, now);
          fadeGain.gain.linearRampToValueAtTime(0, now + fade);

          // Reconnect: source -> fadeGain -> dcBlockFilter (EQ chain)
          source.disconnect();
          source.connect(fadeGain);
          fadeGain.connect(this.dcBlockFilter);

          source.stop(now + fade + 0.005);
          // Clean up fadeGain after fade completes
          source.onended = () => {
            try { source.disconnect(); } catch (_) {}
            try { fadeGain.disconnect(); } catch (_) {}
          };
        } catch (e) {
          try { source.stop(); } catch (_) {}
          try { source.disconnect(); } catch (_) {}
        }
      }

      return { active: false };
    }

    /** Set spatial position in 3D coordinates (degrees azimuth, elevation, distance). */
    setSpatialPosition(azimuthDeg, elevationDeg, distanceM) {
      if (!this.spatialPanner) return false;
      // Convert spherical to Cartesian
      const az = (azimuthDeg || 0) * Math.PI / 180;
      const el = (elevationDeg || 0) * Math.PI / 180;
      const dist = distanceM || 1;
      const x = dist * Math.cos(el) * Math.sin(az);
      const y = dist * Math.sin(el);
      const z = -dist * Math.cos(el) * Math.cos(az); // negative Z = forward
      this.spatialPanner.positionX.setValueAtTime(x, this.audioCtx.currentTime);
      this.spatialPanner.positionY.setValueAtTime(y, this.audioCtx.currentTime);
      this.spatialPanner.positionZ.setValueAtTime(z, this.audioCtx.currentTime);
      return true;
    }

    /** Set spatial orientation (forward/up vectors for HRTF). */
    setSpatialOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
      if (!this.spatialPanner) return false;
      this.spatialPanner.orientationX.setValueAtTime(forwardX || 1, this.audioCtx.currentTime);
      this.spatialPanner.orientationY.setValueAtTime(forwardY || 0, this.audioCtx.currentTime);
      this.spatialPanner.orientationZ.setValueAtTime(forwardZ || 0, this.audioCtx.currentTime);
      // Up vector is implicit in HRTF panner (always Y-up)
      return true;
    }

    /** Enable/disable spatialization (bypass HRTF for mono/stereo compatibility). */
    setSpatialEnabled(enabled) {
      if (!this.spatialPanner) return false;
      this.spatialPanner.panningModel = enabled ? 'HRTF' : 'equalpower';
      return true;
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

    /** Master volume 0..1. Delegates to AudioCore's master volume. */
    setMasterVolume(vol) {
      const v = Math.max(0, Math.min(1.0, parseFloat(vol) || 0));
      if (audioCore) {
        audioCore.setMasterVolume(v);
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