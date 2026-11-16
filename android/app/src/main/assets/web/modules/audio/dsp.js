// --- Modular Audio DSP Subsystem ---
// v2.1: Zero-static brown noise, seamless looping, gesture-gated playback, instant stop.
(function() {
  if (typeof window === 'undefined') return;

  const MAX_MASTER_HEADROOM = 0.85;
  const LIMITER_LINEAR = Math.pow(10, -6.0 / 20); // -6.0 dB ear-safety ceiling
  const XFADE_MS = 20; // Crossfade duration for seamless looping

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

  const audioModule = {
    ctx: null,
    nodes: [],
    userInteracted: false,

    bindGesture() {
      if (this._gestureBound || typeof document === 'undefined') return;
      this._gestureBound = true;
      const unlock = () => {
        this.userInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock, { passive: true });
      document.addEventListener('touchstart', unlock, { passive: true });
      document.addEventListener('keydown', unlock, { passive: true });
    },

    getCtx: function() {
      if (!this.ctx) {
        const AC = window.AudioContext ||
          window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      return this.ctx;
    },

    playBrownNoise: function() {
      if (!this.userInteracted) {
        console.warn('[DSP] Brown noise blocked: user interaction required');
        return;
      }
      const ctx = this.getCtx();
      if (!ctx) return;
      this.stop();
      if (ctx.state === 'suspended') ctx.resume();

      const buffer = createSeamlessBuffer(ctx, 3, (data, sampleRate, durationSec) => {
        const len = Math.floor(sampleRate * durationSec);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + (0.02 * w)) / 1.02;
          // Reduced from 3.5 to 1.2 to eliminate static; final gain applies limiter
          data[i] = last * 1.2;
        }
        // Hard safety clamp
        for (let i = 0; i < len; i++) {
          if (data[i] > 1.0) data[i] = 1.0;
          else if (data[i] < -1.0) data[i] = -1.0;
        }
      });

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      const t = ctx.currentTime + 1.2;
      // Target gain now respects -6dB ceiling: 0.25 * LIMITER_LINEAR ≈ 0.125
      g.gain.linearRampToValueAtTime(0.25 * LIMITER_LINEAR, t);
      
      // DC-blocking high-pass filter (15Hz) to protect transducer coils
      const dcBlock = ctx.createBiquadFilter();
      dcBlock.type = 'highpass';
      dcBlock.frequency.setValueAtTime(15, ctx.currentTime);
      dcBlock.Q.setValueAtTime(0.707, ctx.currentTime);
      
      src.connect(dcBlock);
      dcBlock.connect(g);
      g.connect(ctx.destination);
      src.start();
      this.nodes.push(src, dcBlock, g);
    },

    stop: function() {
      for (const n of this.nodes) {
        try {
          if (n.stop) n.stop();
          if (n.disconnect) n.disconnect();
        } catch(e) {}
      }
      this.nodes = [];
    }
  };

  audioModule.bindGesture();

  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('audio', function() {
      return audioModule;
    });
  }
})();