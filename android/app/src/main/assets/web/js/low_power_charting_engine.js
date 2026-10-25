/**
 * DEEP FOCUS — Low-Power Frame Pacing & Minimalist Charting Engine
 * Mission #040: Pure SVG rendering, 0 external deps, battery-friendly,
 * 320px viewport responsive, RTL/LTR aware, Western digits invariant.
 */
(function (global) {
  'use strict';

  /**
   * Escapes XML/SVG special characters defensively.
   */
  function escapeXml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generates a lightweight, responsive SVG Bar Chart.
   * @param {Array} data - Array of { label: string, value: number }
   * @param {Object} options - { width: number, height: number, isRtl: boolean, barColor: string }
   * @returns {string} Pure SVG markup string.
   */
  function renderBarChart(data, options) {
    options = options || {};
    var width = typeof options.width === 'number' && options.width >= 280 ? options.width : 320;
    var height = typeof options.height === 'number' && options.height >= 100 ? options.height : 160;
    var isRtl = Boolean(options.isRtl);
    var barColor = options.barColor || '#4A7C59';
    var items = Array.isArray(data) ? data : [];

    if (items.length === 0) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
        'class="zen-chart-empty" aria-hidden="true">' +
        '<text x="' + (width / 2) + '" y="' + (height / 2) + '" text-anchor="middle" fill="#888888" font-size="12">' +
        escapeXml(isRtl ? 'لا توجد بيانات تركيز للعرض' : 'No focus data available') +
        '</text></svg>';
    }

    var maxVal = 0;
    for (var i = 0; i < items.length; i++) {
      var v = Number(items[i].value) || 0;
      if (v > maxVal) maxVal = v;
    }
    if (maxVal <= 0) maxVal = 1; // Prevent division by zero

    var padding = 20;
    var chartWidth = width - (padding * 2);
    var chartHeight = height - (padding * 2);
    var barWidth = Math.max(8, Math.floor(chartWidth / (items.length * 1.5)));
    var gap = (chartWidth - (barWidth * items.length)) / Math.max(1, items.length - 1);

    var barsSvg = '';
    for (var idx = 0; idx < items.length; idx++) {
      var item = items[idx];
      var val = Math.max(0, Number(item.value) || 0);
      var barHeight = Math.round((val / maxVal) * (chartHeight - 20));
      
      // Calculate X coordinate respecting RTL/LTR
      var stepIdx = isRtl ? (items.length - 1 - idx) : idx;
      var x = padding + (stepIdx * (barWidth + gap));
      var y = height - padding - barHeight;

      var label = escapeXml(String(item.label || ''));
      var valStr = '\u200E' + val; // Western Arabic digits isolation

      barsSvg += '<g class="zen-bar-group" data-label="' + label + '">' +
        '<rect x="' + Math.round(x) + '" y="' + Math.round(y) + '" width="' + barWidth + '" height="' + barHeight + '" ' +
        'fill="' + barColor + '" rx="3" ry="3" />' +
        '<text x="' + Math.round(x + barWidth / 2) + '" y="' + (height - 5) + '" text-anchor="middle" fill="#666" font-size="10">' +
        label + '</text>' +
        (barHeight > 15 ? '<text x="' + Math.round(x + barWidth / 2) + '" y="' + (y - 4) + '" text-anchor="middle" fill="#333" font-size="9" font-weight="bold">' +
        valStr + '</text>' : '') +
        '</g>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
      'width="100%" height="auto" class="zen-bar-chart" dir="' + (isRtl ? 'rtl' : 'ltr') + '">' +
      '<line x1="' + padding + '" y1="' + (height - padding) + '" x2="' + (width - padding) + '" y2="' + (height - padding) + '" stroke="#E0E0E0" stroke-width="1" />' +
      barsSvg +
      '</svg>';
  }

  /**
   * Generates a lightweight Trend Sparkline SVG.
   */
  function renderSparkline(values, options) {
    options = options || {};
    var width = typeof options.width === 'number' && options.width >= 100 ? options.width : 160;
    var height = typeof options.height === 'number' && options.height >= 30 ? options.height : 40;
    var strokeColor = options.strokeColor || '#2B6CB0';
    var rawList = Array.isArray(values) ? values : [];

    if (rawList.length < 2) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" class="zen-sparkline-empty"></svg>';
    }

    var minVal = Infinity;
    var maxVal = -Infinity;
    var nums = [];
    for (var i = 0; i < rawList.length; i++) {
      var n = Number(rawList[i]) || 0;
      nums.push(n);
      if (n < minVal) minVal = n;
      if (n > maxVal) maxVal = n;
    }
    if (maxVal === minVal) { maxVal += 1; }

    var stepX = width / (nums.length - 1);
    var points = [];
    for (var j = 0; j < nums.length; j++) {
      var px = Math.round(j * stepX);
      var py = Math.round(height - 5 - ((nums[j] - minVal) / (maxVal - minVal)) * (height - 10));
      points.push(px + ',' + py);
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" class="zen-sparkline">' +
      '<polyline fill="none" stroke="' + strokeColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' + points.join(' ') + '" />' +
      '</svg>';
  }

  var engine = {
    escapeXml: escapeXml,
    renderBarChart: renderBarChart,
    renderSparkline: renderSparkline
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.LowPowerChartingEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
