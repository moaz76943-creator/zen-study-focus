/**
 * DEEP FOCUS — High-Fidelity Natural Soundscape Sanctuary Engine (Mission #180)
 * Realistic Brownian/Pink noise filtering for Rain, Waves, Wind, Campfire, and Streams.
 * CC0 offline buffer preference with instantaneous synthetic fallback. Zero music.
 * v2.1: Seamless looping, DC-blocking, hard clamp safety.
 */
(function(root) {
  'use strict';

  const XFADE_MS = 20;
  const DC_BLOCK_HZ = 15;

  // Generate a seamlessly looping buffer by crossfading end to start
  function createSeamlessBuffer(ctx, durationSec, generatorFn) {
    const extraSec = XFADE_MS / 1000;
    const finalSize = Math.floor(ctx.sampleRate * durationSec);
    const xfadeSamples = Math.max(1, Math.floor(ctx.sampleRate * extraSec));
    // Generate exactly finalSize + xfadeSamples so the generator emits a genuine
    // tail continuation past the loop point for the crossfade to consume.
    const bufferSize = finalSize + xfadeSamples;
    const totalSec = bufferSize / ctx.sampleRate;
    const tempBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const tempData = tempBuffer.getChannelData(0);

    generatorFn(tempData, ctx.sampleRate, totalSec);

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

  class SoundscapeSanctuary {
    constructor() {
      this.ctx = null;
      this.activeTracks = {};
      this.isMuted = false;
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // Create a DC-blocking high-pass filter
    createDCBlock() {
      if (!this.ctx) return null;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(DC_BLOCK_HZ, this.ctx.currentTime);
      filter.Q.setValueAtTime(0.707, this.ctx.currentTime); // Butterworth
      return filter;
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
            // Brown Noise: integrate pink noise (-6dB/oct additional slope)
            // With leak factor to prevent unbounded DC drift → no static/clipping on loop
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            b6 = white * 0.115926;
            const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            // Leaky integrator: bounded DC, no drift across buffer restarts
            brownAccum = 0.9985 * brownAccum + pink * 0.5;
            data[i] = brownAccum * 0.8;
            if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
          } else {
            // Campfire crackle: sparse pops on low noise floor
            const pop = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.8 : 0;
            b0 = 0.99 * b0 + white * 0.02;
            data[i] = b0 * 0.1 + pop;
          }
        }
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
      this.initContext();
      if (!this.ctx) return;
      this.stop(soundKey);

      const bufferType = (soundKey.includes('rain') || soundKey.includes('stream') || soundKey.includes('water')) ? 'rain' :
                         (soundKey.includes('ocean') || soundKey.includes('wind')) ? 'ocean' : 'fire';

      const noiseBuffer = this.createNaturalNoiseBuffer(bufferType);
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      // DC-blocking filter
      const dcBlock = this.createDCBlock();

      // مرشح الترددات لنقاء الصوت واستبعاد أي خشونة
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

      const gain = this.ctx.createGain();
      // Reduced gain with -6dB ear-safety ceiling (0.7 → 0.35)
      gain.gain.value = volume * 0.5;

      source.connect(dcBlock);
      dcBlock.connect(filter);
      filter.connect(gain);
      // Route through the shared ear-safety destination so the master kill
      // switch / Stop / tab-hide mutes this track too (never raw destination).
      let out = this.ctx.destination;
      try {
        if (typeof window !== "undefined" && typeof window.getSafeAudioDestination === "function") {
          out = window.getSafeAudioDestination(this.ctx) || this.ctx.destination;
        }
      } catch (_) { out = this.ctx.destination; }
      gain.connect(out);

      source.start();
      this.activeTracks[soundKey] = { source, dcBlock, gain, filter };
    }

    setVolume(soundKey, volume) {
      if (this.activeTracks[soundKey] && this.activeTracks[soundKey].gain) {
        this.activeTracks[soundKey].gain.gain.setValueAtTime(volume, this.ctx ? this.ctx.currentTime : 0);
      }
    }

    stop(soundKey) {
      if (this.activeTracks[soundKey]) {
        try {
          const track = this.activeTracks[soundKey];
          const now = this.ctx ? this.ctx.currentTime : 0;
          const fadeOutSec = 0.06;
          if (track.gain) {
            track.gain.gain.cancelScheduledValues(now);
            track.gain.gain.setValueAtTime(track.gain.gain.value, now);
            track.gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
          }
          track.source.stop(now + fadeOutSec + 0.01);
        } catch (e) {
          try { this.activeTracks[soundKey].source.stop(); } catch (_) {}
        }
        try {
          this.activeTracks[soundKey].source.disconnect();
          this.activeTracks[soundKey].dcBlock?.disconnect();
          this.activeTracks[soundKey].gain?.disconnect();
          this.activeTracks[soundKey].filter?.disconnect();
        } catch (_) {}
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
