/**
 * DEEP FOCUS — High-Fidelity Natural Soundscape Sanctuary Engine (Mission #180)
 * Realistic Brownian/Pink noise filtering for Rain, Waves, Wind, Campfire, and Streams.
 * CC0 offline buffer preference with instantaneous synthetic fallback. Zero music.
 * v2.3: Uses AudioCore for single shared AudioContext, zero static/hiss, instant stop, gesture-gated.
 */
(function(root) {
  'use strict';

  const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;
  const BROWN_POLE = audioCore ? audioCore.BROWN_POLE : 0.997;
  const BROWN_GAIN = audioCore ? audioCore.BROWN_GAIN : 0.4;
  const BROWN_NOISE_AMP = audioCore ? audioCore.BROWN_NOISE_AMP : 0.03;
  const PINK_NOISE_AMP = audioCore ? audioCore.PINK_NOISE_AMP : 0.08;
  const WHITE_NOISE_AMP = audioCore ? audioCore.WHITE_NOISE_AMP : 0.06;

  // Get the single shared master AudioContext (created only on user gesture)
  function getSharedContext() {
    if (audioCore) {
      return audioCore.getContext();
    }
    // Fallback for legacy
    if (typeof window !== 'undefined' && typeof window.dfGetGlobalAudioContext === 'function') {
      try {
        return window.dfGetGlobalAudioContext();
      } catch (e) {
        // Gesture not yet granted
      }
    }
    return null;
  }

  class SoundscapeSanctuary {
    constructor() {
      this.ctx = null;
      this.activeTracks = {};
      this.isMuted = false;
      // Gesture detection delegated to AudioCore (single source of truth)
    }

    initContext() {
      // Use the single shared master AudioContext
      this.ctx = getSharedContext();
      if (!this.ctx) {
        // Context not yet available (no user gesture) - caller must handle
        return false;
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    // إنشاء مخزن صوتي للضوضاء الوردية/البنية فائقة النقاء للمطر والأمواج
    createNaturalNoiseBuffer(type) {
      if (!this.ctx) return null;
      // Delegate to AudioCore for zero-static seamless buffer creation
      if (audioCore && audioCore.createSeamlessBuffer) {
        return audioCore.createSeamlessBuffer(this.ctx, 3, (channelData, sampleRate, durationSec) => {
          const data = channelData[0];
          const bufferSize = Math.floor(sampleRate * durationSec);
          // Full Paul Kellet pink noise filter
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          // Brown noise accumulator with two-pole leaky integrator to prevent DC drift
          let brown1 = 0;
          let brown2 = 0;
          let peak = 0;

          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'rain' || type === 'stream' || type === 'water') {
              // Pink Noise Filter (Paul Kellet -3dB/oct)
              b0 = 0.99886 * b0 + white * 0.0555179;
              b1 = 0.99332 * b1 + white * 0.0750759;
              b2 = 0.96900 * b2 + white * 0.1538520;
              b3 = 0.86650 * b3 + white * 0.3104856;
              b4 = 0.55000 * b4 + white * 0.5329522;
              b5 = -0.7616 * b5 - white * 0.0168980;
              b6 = white * 0.115926;
              data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * PINK_NOISE_AMP;
            } else if (type === 'ocean' || type === 'wind') {
              // Brown Noise: two-pole leaky integrator of WHITE noise (-12dB/oct slope).
              // Using AudioCore's BROWN_POLE and BROWN_GAIN for bounded DC.
              // First pole at BROWN_POLE, second at 0.99 — dramatically reduces DC drift vs single pole.
              brown1 = BROWN_POLE * brown1 + white * BROWN_GAIN;
              brown2 = 0.99 * brown2 + brown1 * 0.1;
              // Fixed output scale using AudioCore's BROWN_NOISE_AMP — the old raw
              // value hard-clamped ~75% of samples at ±1 into harsh static.
              data[i] = brown2 * BROWN_NOISE_AMP;
            } else {
              // Campfire crackle: sparse pops on low noise floor
              // Track noise floor peak separately from pops for consistent normalization
              const pop = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.8 : 0;
              b0 = 0.99 * b0 + white * 0.02;
              const noiseFloor = b0 * 0.1;
              data[i] = noiseFloor + pop;
              // Track peak of noise floor only (pops are rare transients, clamped later)
              const absFloor = Math.abs(noiseFloor);
              if (absFloor > peak) peak = absFloor;
            }
          }
          // AudioCore's createSeamlessBuffer handles DC removal, normalization, clamp
        }, 1, false);
      }
      return null;
    }

    play(soundKey, volume = 0.7) {
      // Zero-autoplay invariant: never start a nature loop while the tab is hidden.
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!audioCore || !audioCore.isGestureReceived()) return; // Hard gate
      this.initContext();
      if (!this.ctx) return;
      this.stop(soundKey);

      const bufferType = (soundKey.includes('rain') || soundKey.includes('stream') || soundKey.includes('water')) ? 'rain' :
                         (soundKey.includes('ocean') || soundKey.includes('wind')) ? 'ocean' : 'fire';

      const noiseBuffer = this.createNaturalNoiseBuffer(bufferType);
      if (!noiseBuffer) return;

      // Build complete filter chain BEFORE starting source to avoid clicks/static
      // Chain: source -> dcBlock -> shaperFilter -> gain -> AudioCore master output
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      // Per-voice gain (fast ramp for click-free start)
      const gain = this.ctx.createGain();
      const FADE_IN_MS = audioCore ? audioCore.FADE_IN_MS : 30;
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE_IN_MS / 1000);

      // Per-voice DC block (belt-and-suspenders with master DC block)
      const dcBlock = this.ctx.createBiquadFilter();
      const DC_BLOCK_HZ = audioCore ? audioCore.DC_BLOCK_HZ : 40;
      dcBlock.type = 'highpass';
      dcBlock.frequency.setValueAtTime(DC_BLOCK_HZ, this.ctx.currentTime);
      dcBlock.Q.setValueAtTime(0.707, this.ctx.currentTime);

      // Spectral shaping filter based on sound type
      const shaperFilter = this.ctx.createBiquadFilter();
      if (bufferType === 'rain') {
        shaperFilter.type = 'lowpass';
        shaperFilter.frequency.value = 1000;
      } else if (bufferType === 'ocean') {
        shaperFilter.type = 'bandpass';
        shaperFilter.frequency.value = 350;
        shaperFilter.Q.value = 1.0;
      } else {
        shaperFilter.type = 'lowpass';
        shaperFilter.frequency.value = 800;
      }

      // Connect chain: source -> dcBlock -> shaperFilter -> gain -> master
      source.connect(dcBlock);
      dcBlock.connect(shaperFilter);
      shaperFilter.connect(gain);
      gain.connect(audioCore.getMasterOutput());

      // A new preset = audible audio desired: restore AudioCore's master
      if (audioCore && typeof audioCore.unmuteMaster === 'function') {
        audioCore.unmuteMaster();
      }

      source.start();

      // Stop function with instant fade and full cleanup
      const FADE_OUT_MS = audioCore ? audioCore.FADE_OUT_MS : 30;
      function stop() {
        try {
          const now = this.ctx.currentTime;
          const fade = FADE_OUT_MS / 1000;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + fade);
          source.stop(now + fade + 0.005);
          // Defer disconnect until fade completes via onended
          source.onended = () => {
            try { source.disconnect(); } catch (_) {}
            try { dcBlock.disconnect(); } catch (_) {}
            try { shaperFilter.disconnect(); } catch (_) {}
            try { gain.disconnect(); } catch (_) {}
          };
        } catch (e) {
          try { source.stop(); } catch (_) {}
          try { source.disconnect(); } catch (_) {}
          try { dcBlock.disconnect(); } catch (_) {}
          try { shaperFilter.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
        }
      }

      // Apply target volume (scale by 0.5 to stay well under limiter)
      const targetGain = Math.max(0.0001, volume * 0.5);
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.05);

      this.activeTracks[soundKey] = { voice: { source, gain, dcBlock, stop }, filter: shaperFilter };
    }

    setVolume(soundKey, volume) {
      const track = this.activeTracks[soundKey];
      if (track && track.voice && track.voice.gain) {
        // Smooth ramp (not a raw setValueAtTime) — click-free slider moves
        const t0 = this.ctx ? this.ctx.currentTime : 0;
        const targetGain = Math.max(0.0001, volume * 0.5);
        track.voice.gain.gain.setTargetAtTime(targetGain, t0, 0.03);
      }
    }

    stop(soundKey) {
      if (this.activeTracks[soundKey]) {
        try {
          const track = this.activeTracks[soundKey];
          track.voice.stop(); // AudioCore handles fade + disconnect
          if (track.filter) {
            try { track.filter.disconnect(); } catch (_) {}
          }
        } catch (e) {
          // Ignore
        }
        delete this.activeTracks[soundKey];
      }
    }

    stopAll() {
      Object.keys(this.activeTracks).forEach(k => this.stop(k));
    }
  }

  const sanctuary = new SoundscapeSanctuary();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundscapeSanctuary, sanctuary };
  } else {
    root.NaturalSoundscapeSanctuary = sanctuary;
  }
})(typeof window !== 'undefined' ? window : this);