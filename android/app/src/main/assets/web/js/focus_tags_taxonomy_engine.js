/**
 * DEEP FOCUS — Focus Tags & Self-Taxonomy Engine
 * Mission #051: Tag normalization, color mapping,
 * time aggregation by tag, and taxonomy durability.
 */
(function (global) {
  'use strict';

  var DEFAULT_PALETTE = ["#3B7A57", "#2B6CB0", "#8C583A", "#6B46C1", "#D69E2E"];

  function normalizeTag(rawTag) {
    if (typeof rawTag !== 'string') return '';
    return rawTag
      .trim()
      .replace(/^#+/, '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, ''); // strip diacritics
  }

  function assignTagColor(tag, index) {
    var idx = typeof index === 'number' && index >= 0 ? index : 0;
    return DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
  }

  function aggregateTimeByTag(sessions) {
    var list = Array.isArray(sessions) ? sessions : [];
    var tagTotals = {};

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || typeof s !== 'object') continue;
      var mins = Number(s.durationMinutes) || 0;
      if (mins <= 0) continue;

      var tags = [];
      if (Array.isArray(s.tags)) tags = s.tags;
      else if (typeof s.tag === 'string') tags = [s.tag];
      else if (typeof s.category === 'string') tags = [s.category];
      else tags = ['عام'];

      for (var t = 0; t < tags.length; t++) {
        var clean = normalizeTag(tags[t]) || 'عام';
        tagTotals[clean] = (tagTotals[clean] || 0) + mins;
      }
    }

    var result = [];
    var keys = Object.keys(tagTotals);
    for (var k = 0; k < keys.length; k++) {
      result.push({
        tag: keys[k],
        totalMinutes: tagTotals[keys[k]],
        color: assignTagColor(keys[k], k)
      });
    }

    result.sort(function (a, b) {
      return b.totalMinutes - a.totalMinutes;
    });

    return result;
  }

  var engine = {
    normalizeTag: normalizeTag,
    assignTagColor: assignTagColor,
    aggregateTimeByTag: aggregateTimeByTag
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.FocusTagsTaxonomyEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
