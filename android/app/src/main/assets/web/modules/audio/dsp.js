// --- Modular Audio DSP Subsystem ---
// v2.2: Zero-static brown noise (2-pole), seamless looping, gesture-gated playback, instant stop.
(function() {
  if (typeof window === 'undefined') return;

  const MAX_MASTER_HEADROOM = 0.85;
  const LIMITER_LINEAR = Math.pow(10, -6.0 / 20); // -6.0 dB ear-safety ceiling
  const XFADE_MS = 20; // Crossfade duration for seamless looping

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

      const buffer = createSeamlessBuffer(ctx, 4, (data, sampleRate, durationSec) => {
        const len = Math.floor(sampleRate * durationSec);
        // 2-pole brown noise (Paul Kellet style) for cleaner spectral rolloff
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const brown = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          // Amplitude well below limiter ceiling, no hard clipping needed
          data[i] = brown * 0.08;
        }
        // Hard safety clamp (defensive)
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
      const t = ctx.currentTime + 1.5;
      // Target gain respects -6dB ceiling: 0.35 * LIMITER_LINEAR ≈ 0.175
      g.gain.linearRampToValueAtTime(0.35 * LIMITER_LINEAR, t);
      
      // DC-blocking high-pass filter (15Hz) to protect transducer coils
      const dcBlock = ctx.createBiquadFilter();
      dcBlock.type = 'highpass';
      dcBlock.frequency.setValueAtTime(15, ctx.currentTime);
      dcBlock.Q.setValueAtTime(0.707, ctx.currentTime);
      
      // Low-pass filter (200Hz) to remove residual high-frequency hiss from brown noise
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(200, ctx.currentTime);
      lowpass.Q.setValueAtTime(0.707, ctx.currentTime);
      
      src.connect(dcBlock);
      dcBlock.connect(lowpass);
      lowpass.connect(g);
      g.connect(ctx.destination);
      src.start();
      this.nodes.push(src, dcBlock, lowpass, g);
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