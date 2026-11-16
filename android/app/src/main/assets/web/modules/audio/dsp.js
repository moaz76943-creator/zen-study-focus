// --- Modular Audio DSP Subsystem ---
// v2.0: Zero-static brown noise, gesture-gated playback, instant stop.
(function() {
  if (typeof window === 'undefined') return;

  const MAX_MASTER_HEADROOM = 0.85;
  const LIMITER_LINEAR = Math.pow(10, -6.0 / 20); // -6.0 dB ear-safety ceiling

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

      const len = Math.floor(ctx.sampleRate * 3);
      const buf = ctx.createBuffer(
        1, len, ctx.sampleRate
      );
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + (0.02 * w)) / 1.02;
        // Reduced from 3.5 to 1.2 to eliminate static; final gain applies limiter
        d[i] = last * 1.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      const t = ctx.currentTime + 1.2;
      // Target gain now respects -6dB ceiling: 0.25 * LIMITER_LINEAR ≈ 0.125
      g.gain.linearRampToValueAtTime(0.25 * LIMITER_LINEAR, t);
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
      this.nodes.push(src, g);
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