// --- Modular Audio DSP Subsystem ---
(function() {
  if (typeof window === 'undefined') return;
  const audioModule = {
    ctx: null, nodes: [],
    getCtx: function() {
      if (!this.ctx) {
        const AC = window.AudioContext ||
          window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      return this.ctx;
    },
    playBrownNoise: function() {
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
        d[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      const t = ctx.currentTime + 1.2;
      g.gain.linearRampToValueAtTime(0.25, t);
      src.connect(g);
      g.connect(ctx.destination);
      src.start(); this.nodes.push(src, g);
    },
    stop: function() {
      this.nodes.forEach(function(n) {
        try {
          if (n.stop) n.stop();
          if (n.disconnect) n.disconnect();
        } catch(e) {}
      });
      this.nodes = [];
    }
  };
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('audio', function() {
      return audioModule;
    });
  }
})();
