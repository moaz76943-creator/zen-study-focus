/**
 * DEEP FOCUS — Tactile Breath Pacer Engine (M091 / M092 Updated)
 * File: android/app/src/main/assets/web/js/tactile_breath_pacer_engine.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.TactileBreathPacerEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  var PATTERNS = [
    {
      id: 'box_breathing',
      i18n_name: 'breath.box_breathing.name',
      i18n_desc: 'breath.box_breathing.desc',
      category: 'focus_reset',
      default_cycles: 4,
      phases: [
        { name: 'inhale', i18n_label: 'breath.phase.inhale', duration_sec: 4, haptic: [20] },
        { name: 'hold_in', i18n_label: 'breath.phase.hold_in', duration_sec: 4, haptic: [15, 60, 15] },
        { name: 'exhale', i18n_label: 'breath.phase.exhale', duration_sec: 4, haptic: [30] },
        { name: 'hold_out', i18n_label: 'breath.phase.hold_out', duration_sec: 4, haptic: [10] }
      ]
    },
    {
      id: 'calming_4_7_8',
      i18n_name: 'breath.calming_4_7_8.name',
      i18n_desc: 'breath.calming_4_7_8.desc',
      category: 'deep_calm',
      default_cycles: 4,
      phases: [
        { name: 'inhale', i18n_label: 'breath.phase.inhale_quiet', duration_sec: 4, haptic: [20] },
        { name: 'hold_in', i18n_label: 'breath.phase.hold_gentle', duration_sec: 7, haptic: [15, 60, 15] },
        { name: 'exhale', i18n_label: 'breath.phase.exhale_slow', duration_sec: 8, haptic: [40] }
      ]
    },
    {
      id: 'resonant_coherence',
      i18n_name: 'breath.resonant_coherence.name',
      i18n_desc: 'breath.resonant_coherence.desc',
      category: 'flow_state',
      default_cycles: 6,
      phases: [
        { name: 'inhale', i18n_label: 'breath.phase.flow_inhale', duration_sec: 5, haptic: [20] },
        { name: 'exhale', i18n_label: 'breath.phase.flow_exhale', duration_sec: 5, haptic: [30] }
      ]
    },
    {
      id: 'refresh_energizer',
      i18n_name: 'breath.refresh_energizer.name',
      i18n_desc: 'breath.refresh_energizer.desc',
      category: 'energize',
      default_cycles: 5,
      phases: [
        { name: 'inhale', i18n_label: 'breath.phase.brisk_inhale', duration_sec: 4, haptic: [25] },
        { name: 'hold_in', i18n_label: 'breath.phase.brief_hold', duration_sec: 2, haptic: [15] },
        { name: 'exhale', i18n_label: 'breath.phase.firm_exhale', duration_sec: 4, haptic: [25] }
      ]
    }
  ];

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getPatternCycleDuration(pattern) {
    if (!pattern || !Array.isArray(pattern.phases)) return 0;
    var total = 0;
    for (var i = 0; i < pattern.phases.length; i++) {
      total += pattern.phases[i].duration_sec;
    }
    return total;
  }

  function getPatterns(locale) {
    var list = clone(PATTERNS);
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      p.cycle_duration_sec = getPatternCycleDuration(p);
      p.name = translate(p.i18n_name, locale);
      p.description = translate(p.i18n_desc, locale);
      p.name_en = translate(p.i18n_name, 'en');
      p.name_ar = translate(p.i18n_name, 'ar');
      p.description_en = translate(p.i18n_desc, 'en');
      p.description_ar = translate(p.i18n_desc, 'ar');
      for (var j = 0; j < p.phases.length; j++) {
        p.phases[j].label = translate(p.phases[j].i18n_label, locale);
        p.phases[j].label_en = translate(p.phases[j].i18n_label, 'en');
        p.phases[j].label_ar = translate(p.phases[j].i18n_label, 'ar');
      }
    }
    return list;
  }

  function getPatternById(id, locale) {
    var all = getPatterns(locale);
    if (!id || typeof id !== 'string') {
      return all[0];
    }
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        return all[i];
      }
    }
    return all[0];
  }

  function scaleHaptic(patternArr, strength) {
    if (strength === 'off' || !Array.isArray(patternArr)) {
      return [];
    }
    var multiplier = 1.0;
    if (strength === 'subtle') multiplier = 0.5;
    if (strength === 'firm') multiplier = 1.5;

    var scaled = [];
    for (var i = 0; i < patternArr.length; i++) {
      scaled.push(Math.max(5, Math.round(patternArr[i] * multiplier)));
    }
    return scaled;
  }

  function createPacerSession(patternId, targetCycles, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var pattern = getPatternById(patternId, locale);
    var cycles = (typeof targetCycles === 'number' && targetCycles > 0) ? Math.floor(targetCycles) : pattern.default_cycles;
    var hapticStrength = opts.hapticStrength || 'medium';

    return {
      patternId: pattern.id,
      patternName: pattern.name,
      patternName_ar: pattern.name_ar,
      patternName_en: pattern.name_en,
      locale: locale,
      targetCycles: cycles,
      currentCycle: 1,
      currentPhaseIndex: 0,
      phaseElapsedSec: 0,
      sessionElapsedSec: 0,
      totalSessionSec: getPatternCycleDuration(pattern) * cycles,
      status: 'idle',
      hapticStrength: hapticStrength,
      lastHapticEvent: null
    };
  }

  function stepSession(session, deltaSec) {
    if (!session || session.status !== 'running') {
      return session;
    }

    var remainingDelta = (typeof deltaSec === 'number' && deltaSec > 0) ? deltaSec : 1;
    var pattern = getPatternById(session.patternId, session.locale);
    var phases = pattern.phases;

    while (remainingDelta > 0 && session.status === 'running') {
      var currentPhase = phases[session.currentPhaseIndex];
      var neededForPhase = currentPhase.duration_sec - session.phaseElapsedSec;

      if (remainingDelta >= neededForPhase) {
        session.sessionElapsedSec += neededForPhase;
        remainingDelta -= neededForPhase;
        session.phaseElapsedSec = 0;
        session.currentPhaseIndex++;

        if (session.currentPhaseIndex >= phases.length) {
          session.currentPhaseIndex = 0;
          session.currentCycle++;

          if (session.currentCycle > session.targetCycles) {
            session.currentCycle = session.targetCycles;
            session.status = 'completed';
            session.currentPhaseIndex = phases.length - 1;
            session.phaseElapsedSec = phases[session.currentPhaseIndex].duration_sec;
            return session;
          }
        }

        var newPhase = phases[session.currentPhaseIndex];
        session.lastHapticEvent = {
          phase: newPhase.name,
          hapticPattern: scaleHaptic(newPhase.haptic, session.hapticStrength),
          timestamp: Date.now()
        };
      } else {
        session.phaseElapsedSec += remainingDelta;
        session.sessionElapsedSec += remainingDelta;
        remainingDelta = 0;
      }
    }

    return session;
  }

  function renderBreathPacerSVG(session, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || (session && session.locale) || 'en';
    var width = opts.width || 360;
    var height = opts.height || 360;

    var pattern = getPatternById(session ? session.patternId : 'box_breathing', locale);
    var phaseIndex = session ? session.currentPhaseIndex : 0;
    var currentPhase = pattern.phases[phaseIndex] || pattern.phases[0];
    var phaseElapsed = session ? session.phaseElapsedSec : 0;
    var phaseDuration = currentPhase.duration_sec || 4;
    var cycleNum = session ? session.currentCycle : 1;
    var targetCycles = session ? session.targetCycles : 4;

    var progress = Math.min(1.0, Math.max(0.0, phaseElapsed / phaseDuration));

    var baseRadius = 70;
    var maxRadius = 120;
    var currentRadius = baseRadius;
    var auraOpacity = 0.3;
    var accentColor = '#38BDF8';

    if (currentPhase.name === 'inhale') {
      currentRadius = baseRadius + (maxRadius - baseRadius) * progress;
      auraOpacity = 0.2 + (0.4 * progress);
      accentColor = '#38BDF8';
    } else if (currentPhase.name === 'hold_in') {
      currentRadius = maxRadius;
      auraOpacity = 0.6;
      accentColor = '#818CF8';
    } else if (currentPhase.name === 'exhale') {
      currentRadius = maxRadius - (maxRadius - baseRadius) * progress;
      auraOpacity = 0.6 - (0.4 * progress);
      accentColor = '#34D399';
    } else if (currentPhase.name === 'hold_out') {
      currentRadius = baseRadius;
      auraOpacity = 0.2;
      accentColor = '#94A3B8';
    }

    currentRadius = Math.round(currentRadius);
    var remainingSec = Math.max(0, Math.ceil(phaseDuration - phaseElapsed));
    var phaseLabel = translate(currentPhase.i18n_label, locale);
    var cycleWord = translate('common.cycle', locale);
    var ofWord = translate('common.of', locale);
    var cycleLabel = cycleWord + ' ' + cycleNum + ' ' + ofWord + ' ' + targetCycles;

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<radialGradient id="breathGlow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="' + accentColor + '" stop-opacity="' + auraOpacity + '"/>' +
            '<stop offset="70%" stop-color="' + accentColor + '" stop-opacity="' + (auraOpacity * 0.4) + '"/>' +
            '<stop offset="100%" stop-color="#020617" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<linearGradient id="pacerBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="24" fill="url(#pacerBg)" stroke="#1E293B" stroke-width="1.5"/>' +
        '<circle cx="180" cy="170" r="' + (currentRadius + 24) + '" fill="url(#breathGlow)"/>' +
        '<circle cx="180" cy="170" r="120" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="4 4"/>' +
        '<circle cx="180" cy="170" r="70" fill="none" stroke="#1E293B" stroke-width="1.5"/>' +
        '<circle cx="180" cy="170" r="' + currentRadius + '" fill="' + accentColor + '" fill-opacity="0.15" stroke="' + accentColor + '" stroke-width="3"/>' +
        '<text x="180" y="162" fill="#F8FAFC" font-size="34" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">' +
          remainingSec + 's' +
        '</text>' +
        '<text x="180" y="194" fill="' + accentColor + '" font-size="14" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">' +
          phaseLabel +
        '</text>' +
        '<text x="180" y="44" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif" text-anchor="middle">' +
          pattern.name +
        '</text>' +
        '<rect x="110" y="306" width="140" height="26" rx="13" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<text x="180" y="323" fill="#E2E8F0" font-size="11" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">' +
          cycleLabel +
        '</text>' +
      '</svg>';

    return svg;
  }

  function triggerHaptic(patternArr) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (Array.isArray(patternArr) && patternArr.length > 0) {
          navigator.vibrate(patternArr);
          return true;
        }
      } catch (e) {
      }
    }
    return false;
  }

  return {
    getPatterns: getPatterns,
    getPatternById: getPatternById,
    getPatternCycleDuration: getPatternCycleDuration,
    createPacerSession: createPacerSession,
    stepSession: stepSession,
    scaleHaptic: scaleHaptic,
    renderBreathPacerSVG: renderBreathPacerSVG,
    triggerHaptic: triggerHaptic
  };
}));
