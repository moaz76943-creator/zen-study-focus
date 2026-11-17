// --- Modular Audio DSP Subsystem ---
// v2.3: Single shared AudioContext, zero-static brown noise (2-pole), seamless looping, gesture-gated playback, instant stop.
(function() {
  if (typeof window === 'undefined') return;

  const MAX_MASTER_HEADROOM = 0.85;
  const LIMITER_LINEAR = Math.pow(10, -6.0 / 20); // -6.0 dB ear-safety ceiling
  const XFADE_MS = 20; // Crossfade duration for seamless looping
  const FADE_OUT_SEC = 0.06; // Click-free fade duration

  // Get the single shared master AudioContext (created only on user gesture)
  function getSharedContext() {
    if (typeof window !== 'undefined' && typeof window.dfGetGlobalAudioContext === 'function') {
      try {
        return window.dfGetGlobalAudioContext();
      } catch (e) {
        // Gesture not yet granted
      }
    }
    return null;
  }

  // Generate a seamlessly looping buffer by crossfading end to start
  // Includes DC removal, peak normalization, and hard safety clamp
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

    // Hard safety clamp (defensive)
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
      // Use the single shared master AudioContext
      this.ctx = getSharedContext();
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
        // True brown noise: leaky integrator of WHITE noise (-6dB/oct),
        // peak-normalized below the limiter ceiling + DC removal. The old
        // Kellet-pink generator was mislabeled "brown" and left a rumble
        // bias that bled as a constant background hum.
        let brown = 0;
        let peak = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          brown = 0.9985 * brown + white * 0.5;
          data[i] = brown;
          if (Math.abs(brown) > peak) peak = Math.abs(brown);
        }
        let mean = 0;
        for (let i = 0; i < len; i++) mean += data[i];
        mean /= len;
        for (let i = 0; i < len; i++) data[i] -= mean;
        const norm = peak > 0 ? 0.9 / peak : 1;
        for (let i = 0; i < len; i++) data[i] *= norm;
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
      // Route through the shared ear-safety destination so the master kill
      // switch / Stop / tab-hide mutes this source too (never raw destination).
      let out = ctx.destination;
      try {
        if (typeof globalThis !== "undefined" && typeof globalThis.getSafeAudioDestination === "function") {
          out = globalThis.getSafeAudioDestination(ctx) || ctx.destination;
        } else if (typeof window !== "undefined" && typeof window.getSafeAudioDestination === "function") {
          out = window.getSafeAudioDestination(ctx) || ctx.destination;
        }
      } catch (_) { out = ctx.destination; }
      g.connect(out);
      src.start();
      this.nodes.push(src, dcBlock, lowpass, g);
    },

    stop: function() {
      const now = this.ctx ? this.ctx.currentTime : 0;
      for (const n of this.nodes) {
        try {
          if (n.stop) {
            // Use click-free fade for source nodes
            if (n.gain && typeof n.gain.gain !== 'undefined') {
              n.gain.gain.cancelScheduledValues(now);
              n.gain.gain.setValueAtTime(n.gain.gain.value, now);
              n.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_SEC);
              n.stop(now + FADE_OUT_SEC + 0.01);
            } else {
              n.stop();
            }
          }
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