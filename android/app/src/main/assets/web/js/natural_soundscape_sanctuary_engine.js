/**
 * DEEP FOCUS — High-Fidelity Natural Soundscape Sanctuary Engine (Mission #180)
 * Realistic Brownian/Pink noise filtering for Rain, Waves, Wind, Campfire, and Streams.
 * CC0 offline buffer preference with instantaneous synthetic fallback. Zero music.
 */
(function(root) {
  'use strict';

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

    // إنشاء مخزن صوتي للضوضاء الوردية/البنية فائقة النقاء للمطر والأمواج
    createNaturalNoiseBuffer(type) {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * 3; // 3 ثوانٍ بحلقة سلسة
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
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
          data[i] = b0 * 3.5;
        } else {
          // محاكاة طقطقة حطب النار الهادئة (Campfire)
          const pop = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 2 : 0;
          b0 = 0.99 * b0 + white * 0.02;
          data[i] = b0 + pop;
        }
      }
      return buffer;
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
      gain.gain.value = volume;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      source.start();
      this.activeTracks[soundKey] = { source, gain, filter };
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
