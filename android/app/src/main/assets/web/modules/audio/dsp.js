/**
 * DEEP FOCUS — Modular Audio DSP Subsystem (v2.4)
 * Uses AudioCore for all Web Audio operations.
 * Zero-static brown noise, seamless looping, gesture-gated, instant stop.
 */
(function() {
  if (typeof window === 'undefined') return;

  const audioCore = window.AudioCore;

  const dspModule = {
    ctx: null,
    nodes: [],
    activeVoices: [],

    getCtx: function() {
      this.ctx = audioCore.getContext();
      return this.ctx;
    },

    playBrownNoise: function() {
      if (!audioCore.isGestureReceived()) {
        console.warn('[DSP] Brown noise blocked: user interaction required');
        return;
      }
      const ctx = this.getCtx();
      if (!ctx) return;
      this.stop();

      if (ctx.state === 'suspended') ctx.resume();

      // Generate 4-second brown noise buffer via AudioCore
      const buffer = audioCore.createSeamlessBuffer(ctx, 4, audioCore.generateBrownNoise, 1);

      const voice = audioCore.createVoice(buffer, true);
      if (voice) {
        // Scale voice gain to respect limiter ceiling
        voice.gain.gain.setValueAtTime(0.35 * audioCore.LIMITER_LINEAR, ctx.currentTime);
        this.activeVoices.push(voice);
      }
    },

    playPinkNoise: function() {
      if (!audioCore.isGestureReceived()) return;
      const ctx = this.getCtx();
      if (!ctx) return;
      this.stop();

      if (ctx.state === 'suspended') ctx.resume();

      const buffer = audioCore.createSeamlessBuffer(ctx, 4, audioCore.generatePinkNoise, 1);
      const voice = audioCore.createVoice(buffer, true);
      if (voice) {
        voice.gain.gain.setValueAtTime(0.3 * audioCore.LIMITER_LINEAR, ctx.currentTime);
        this.activeVoices.push(voice);
      }
    },

    playWhiteNoise: function() {
      if (!audioCore.isGestureReceived()) return;
      const ctx = this.getCtx();
      if (!ctx) return;
      this.stop();

      if (ctx.state === 'suspended') ctx.resume();

      const buffer = audioCore.createSeamlessBuffer(ctx, 3, audioCore.generateWhiteNoise, 1);
      const voice = audioCore.createVoice(buffer, true);
      if (voice) {
        voice.gain.gain.setValueAtTime(0.2 * audioCore.LIMITER_LINEAR, ctx.currentTime);
        this.activeVoices.push(voice);
      }
    },

    stop: function() {
      this.activeVoices.forEach(v => v.stop());
      this.activeVoices = [];
      this.nodes = [];
    }
  };

  // Register with module registry
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('audio', function() {
      return dspModule;
    });
  }

  // Back-compat: expose on window for legacy callers
  window.dfAudioDSP = dspModule;
})();