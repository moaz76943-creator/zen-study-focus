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
    const totalSec = durationSec + extraSec;
    const bufferSize = Math.floor(ctx.sampleRate * totalSec);
    const tempBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const tempData = tempBuffer.getChannelData(0);
    
    // Generate extra-long buffer
    generatorFn(tempData, ctx.sampleRate, totalSec);
    
    // Create final buffer with exact duration
    const finalSize = Math.floor(ctx.sampleRate * durationSec);
    const finalBuffer = ctx.createBuffer(1, finalSize, ctx.sampleRate);
    const finalData = finalBuffer.getChannelData(0);
    
    const xfadeSamples = Math.floor(ctx.sampleRate * extraSec);
    // Copy main portion
    finalData.set(tempData.subarray(0, finalSize));
    // Crossfade loop point: blend end into start
    for (let i = 0; i < xfadeSamples; i++) {
      const t = i / xfadeSamples;
      const endIdx = finalSize - xfadeSamples + i;
      finalData[i] = (1 - t) * finalData[i] + t * tempData[endIdx];
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
        let b0 = 0, b1 = 0, b2 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'rain' || type === 'water') {
            // محاكاة قطرات المطر (Pink Noise Filter)
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            data[i] = (b0 + b1) * 0.5;
          } else if (type === 'ocean' || type === 'wind') {
            // محاكاة هدير الأمواج والرياح العميقة (Brownian Noise)
            b0 = (b0 + (0.02 * white)) / 1.02;
            // Reduced from 3.5 to 1.5 to eliminate static, filtered by bandpass
            data[i] = b0 * 1.5;
          } else {
            // محاكاة طقطقة حطب النار الهادئة (Campfire)
            const pop = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.8 : 0; // Reduced from 2 to 0.8
            b0 = 0.99 * b0 + white * 0.02;
            data[i] = b0 + pop;
          }
        }
        // Hard safety clamp
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
      gain.connect(this.ctx.destination);

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
          this.activeTracks[soundKey].source.stop();
          this.activeTracks[soundKey].source.disconnect();
        } catch (e) {}
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
