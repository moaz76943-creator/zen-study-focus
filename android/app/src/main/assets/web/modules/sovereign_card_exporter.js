/**
 * DEEP FOCUS — SovereignCardExporter (v586.0.0)
 * Renders high-DPI visual study achievement cards via HTML5 Canvas.
 * Generates PNG data URLs for local saving or native Android share intents.
 */
(function (global) {
  'use strict';

  var SovereignCardExporter = {
    version: '586.0.0',

    /**
     * Synthesizes a milestone card specification into a rendered canvas
     * @param {Object} data - { title, subtitle, statValue, statLabel, date, theme }
     */
    generateCardSpec: function (data) {
      if (!data) data = {};
      return {
        title: String(data.title || 'Deep Focus Milestone'),
        subtitle: String(data.subtitle || 'Sovereign Study Achievement'),
        statValue: String(data.statValue || '100%'),
        statLabel: String(data.statLabel || 'Focus Completed'),
        date: String(data.date || (function(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(new Date())),
        theme: String(data.theme || 'amoled'),
        width: 1080,
        height: 1080
      };
    },

    renderToCanvas: function (spec, targetCanvas) {
      if (typeof document === 'undefined') return null;
      var canvas = targetCanvas || document.createElement('canvas');
      canvas.width = spec.width || 1080;
      canvas.height = spec.height || 1080;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 1. AMOLED Black Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Subtle Gradient Ambient Ring
      var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#065f46');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 460, 240, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Central Metric Typography
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 84px sans-serif';
      ctx.fillText(spec.statValue, canvas.width / 2, 450);

      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(spec.statLabel, canvas.width / 2, 510);

      // 4. Header Titles
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(spec.title, canvas.width / 2, 140);

      ctx.font = '28px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(spec.subtitle, canvas.width / 2, 190);

      // 5. Footer Watermark
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#4b5563';
      ctx.fillText('DEEP FOCUS — SOVEREIGN STUDY OS • ' + spec.date, canvas.width / 2, 980);

      return canvas;
    },

    exportDataUrl: function (data) {
      var spec = this.generateCardSpec(data);
      if (typeof document !== 'undefined') {
        var canvas = this.renderToCanvas(spec);
        if (canvas && typeof canvas.toDataURL === 'function') {
          return canvas.toDataURL('image/png');
        }
      }
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    },

    shareMilestone: function (data) {
      var dataUrl = this.exportDataUrl(data);
      if (global.AndroidBridge && typeof global.AndroidBridge.shareImage === 'function') {
        try {
          global.AndroidBridge.shareImage(dataUrl, data ? data.title : 'Study Milestone');
        } catch (e) {}
      }
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('milestone:shared', { title: data ? data.title : 'Milestone' });
      }
      return true;
    }
  };

  global.SovereignCardExporter = SovereignCardExporter;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_card_exporter', SovereignCardExporter);
  }
})(typeof window !== 'undefined' ? window : globalThis);
