// --- Modular Zen Subsystem ---
(function() {
  if (typeof window === 'undefined') return;
  const zenModule = {
    drawBranch: function(ctx, x, y, len, ang, d) {
      if (d <= 0) return;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const x2 = x + len * Math.sin(ang);
      const y2 = y - len * Math.cos(ang);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = d > 2 ?
        '#8B5A2B' : '#2E8B57';
      ctx.lineWidth = Math.max(1, d);
      ctx.stroke();
      const nL = len * 0.75;
      const dS = d - 1;
      this.drawBranch(
        ctx, x2, y2, nL, ang - 0.35, dS
      );
      this.drawBranch(
        ctx, x2, y2, nL, ang + 0.35, dS
      );
    },
    renderTree: function(canvas, progressPct) {
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const pVal = progressPct || 0.1;
      const pct = Math.max(0, Math.min(1.0, pVal));
      const depth = Math.floor(pct * 6) + 1;
      const trunk = Math.floor(canvas.height * 0.22);
      const sX = canvas.width / 2;
      const sY = canvas.height - 10;
      this.drawBranch(ctx, sX, sY, trunk, 0, depth);
    }
  };
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('zen', function() {
      return zenModule;
    });
  }
})();
