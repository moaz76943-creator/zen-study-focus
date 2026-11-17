/**
 * DEEP FOCUS — High-Fidelity Natural Soundscape Sanctuary Engine (Mission #180)
 * Realistic Brownian/Pink noise filtering for Rain, Waves, Wind, Campfire, and Streams.
 * CC0 offline buffer preference with instantaneous synthetic fallback. Zero music.
 * v2.3: Uses AudioCore for single shared AudioContext, zero static/hiss, instant stop, gesture-gated.
 */
(function(root) {
  'use strict';

  const audioCore = typeof window !== 'undefined' ? window.AudioCore : null;

  // Generate a seamlessly looping buffer by crossfading end to start
  // Delegates to AudioCore for the actual implementation
  function createSeamlessBuffer(ctx, durationSec, generatorFn) {
    if (audioCore && audioCore.createSeamlessBuffer) {
      return audioCore.createSeamlessBuffer(ctx, durationSec, generatorFn, 1);
    }
    // Fallback (should never be used)
    const XFADE_MS = 20;
    const extraSec = XFADE_MS / 1000;
    const finalSize = Math.floor(ctx.sampleRate * durationSec);
    const xfadeSamples = Math.max(1, Math.floor(ctx.sampleRate * extraSec));
    const bufferSize = finalSize + xfadeSamples;
    const totalSec = bufferSize / ctx.sampleRate;
    const tempBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const tempData = tempBuffer.getChannelData(0);

    generatorFn(tempData, ctx.sampleRate, totalSec);

    // DC-removal pass: kill residual sample-average hum before crossfade
    let mean = 0;
    for (let i = 0; i < bufferSize; i++) mean += tempData[i];
    mean /= bufferSize;
    for (let i = 0; i < bufferSize; i++) tempData[i] -= mean;

    // Peak-normalize to 0.9 (full scale minus headroom): guarantees no clipping
    // and identical loudness across loop restarts.
    let peak = 0;
    for (let i = 0; i < bufferSize; i++) {
      const absV = Math.abs(tempData[i]);
      if (absV > peak) peak = absV;
    }
    const norm = peak > 0 ? 0.9 / peak : 1;
    for (let i = 0; i < bufferSize; i++) tempData[i] *= norm;

    // Hard safety clamp (defensive, should never trigger after normalization)
    for (let i = 0; i < bufferSize; i++) {
      if (tempData[i] > 1.0) tempData[i] = 1.0;
      else if (tempData[i] < -1.0) tempData[i] = -1.0;
    }

    const finalBuffer = ctx.createBuffer(1, finalSize, ctx.sampleRate);
    const finalData = finalBuffer.getChannelData(0);
    // Copy the main body; the tail samples remain as-is.
    finalData.set(tempData.subarray(0, finalSize));
    // Crossfade the genuine tail continuation into the head so the loop wrap
    // is click-free. Weighting makes final[0] == tail-start and
    // final[xfade-1] == head, which is continuous with the generator output
    // across the loop boundary (temp[finalSize-1] -> temp[finalSize]).
    for (let i = 0; i < xfadeSamples; i++) {
      const t = i / xfadeSamples;
      finalData[i] = (1 - t) * tempData[finalSize + i] + t * tempData[i];
    }
    return finalBuffer;
  }

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
      this.userInteracted = false;
      this.bindGestureUnlock();
    }

    bindGestureUnlock() {
      if (typeof document === 'undefined' || this._gestureBound) return;
      this._gestureBound = true;
      const unlock = () => {
        this.userInteracted = true;
        // Resume shared context if available
        const sharedCtx = getSharedContext();
        if (sharedCtx && sharedCtx.state === 'suspended') {
          sharedCtx.resume().catch(() => {});
        }
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock, { passive: true });
      document.addEventListener('touchstart', unlock, { passive: true });
      document.addEventListener('keydown', unlock, { passive: true });
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
      return createSeamlessBuffer(this.ctx, 3, (data, sampleRate, durationSec) => {
        const bufferSize = Math.floor(sampleRate * durationSec);
        // Full Paul Kellet pink noise filter
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        // Brown noise accumulator with leak to prevent DC drift (bounded random walk)
        let brownAccum = 0;
        let peak = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'rain' || type === 'water') {
            // Pink Noise Filter (Paul Kellet -3dB/oct)
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            b6 = white * 0.115926;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          } else if (type === 'ocean' || type === 'wind') {
            // Brown Noise: leaky integrator of WHITE noise (-6dB/oct slope).
            // Using AudioCore's BROWN_POLE (0.997) and BROWN_GAIN (0.4) for bounded DC.
            brownAccum = 0.997 * brownAccum + white * 0.4;
            data[i] = brownAccum;
          } else {
            // Campfire crackle: sparse pops on low noise floor
            const pop = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.8 : 0;
            b0 = 0.99 * b0 + white * 0.02;
            data[i] = b0 * 0.1 + pop;
          }
          // Peak tracked for EVERY noise family so rain/fire normalize to the
          // same 0.9 ceiling as ocean — rain/fire previously never normalized,
          // so loudness and loop-restart consistency varied by sound type.
          const absV = Math.abs(data[i]);
          if (absV > peak) peak = absV;
        }
        // DC-removal pass: kill residual sample-average hum (constant static)
        // before the buffer reaches a gain node.
        let mean = 0;
        for (let i = 0; i < bufferSize; i++) mean += data[i];
        mean /= bufferSize;
        for (let i = 0; i < bufferSize; i++) data[i] -= mean;
        // Peak-normalize to 0.9 (full scale minus headroom): guarantees no clipping
        // and identical loudness across loop restarts.
        const norm = peak > 0 ? 0.9 / peak : 1;
        for (let i = 0; i < bufferSize; i++) data[i] *= norm;
        // Hard safety clamp (defensive, should never trigger after normalization)
        for (let i = 0; i < bufferSize; i++) {
          if (data[i] > 1.0) data[i] = 1.0;
          else if (data[i] < -1.0) data[i] = -1.0;
        }
      });
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

      // Use AudioCore's voice management for consistent behavior
      const voice = audioCore.createVoice(noiseBuffer, true);
      if (!voice) return;

      // Apply volume (voice gain starts at 0.0001 and ramps to 1 in 30ms)
      // Scale by volume * 0.5 to stay well under limiter
      const targetGain = Math.max(0.0001, volume * 0.5);
      const now = this.ctx.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(0.0001, now);
      voice.gain.gain.linearRampToValueAtTime(targetGain, now + 0.05);

      // Add spectral shaping based on sound type
      const filter = this.ctx.createBiquadFilter();
      if (bufferType === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
      } else if (bufferType === 'ocean') {
        filter.type = 'bandpass';
        filter.frequency.value = 350;
        filter.Q.value = 1.0;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      }

      // Insert filter between dcBlock and gain
      voice.dcBlock.disconnect();
      voice.dcBlock.connect(filter);
      filter.connect(voice.gain);

      this.activeTracks[soundKey] = { voice, filter };
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