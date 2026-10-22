/**
 * DEEP FOCUS — Tactile Breath Pacer Engine (M091)
 * File: android/app/src/main/assets/web/js/tactile_breath_pacer_engine.js
 *
 * Provides rhythmic haptic and visual breath pacing patterns (Box Breathing, 4-7-8, Coherence)
 * to facilitate cognitive reset, stress relief, and mindful transitions between study sessions.
 *
 * Core Directives & Standards:
 * - Strictly Non-Medical (Mindful cognitive calming & study focus reset, zero therapeutic claims)
 * - Tactile Haptic Vibration coordination (Subtle, Medium, Firm with safe silent fallback)
 * - Procedural Pure SVG Visual Pacer (Expanding/contracting Zen aura, zero raster assets)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TactileBreathPacerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PATTERNS = [
    {
      id: 'box_breathing',
      name_ar: 'تنفس المربع المتوازن (4-4-4-4)',
      name_en: 'Box Breathing (4-4-4-4)',
      description_ar: 'أربع ثوانٍ شهيق، أربع حبس، أربع زفير، وأربع ثبات. مثالي لاستعادة الهدوء والتركيز الحاد قبل بدء جلسة مذاكرة صعبة.',
      description_en: 'Equal 4s phases for instant mental clarity and sharp focus before demanding study sprints.',
      category: 'focus_reset',
      default_cycles: 4,
      phases: [
        { name: 'inhale', label_ar: 'شهيق عميق', label_en: 'Deep Inhale', duration_sec: 4, haptic: [20] },
        { name: 'hold_in', label_ar: 'حبس النفس', label_en: 'Hold Breath', duration_sec: 4, haptic: [15, 60, 15] },
        { name: 'exhale', label_ar: 'زفير هادئ', label_en: 'Slow Exhale', duration_sec: 4, haptic: [30] },
        { name: 'hold_out', label_ar: 'ثبات واسترخاء', label_en: 'Rest & Hold', duration_sec: 4, haptic: [10] }
      ]
    },
    {
      id: 'calming_4_7_8',
      name_ar: 'تنفس الاسترخاء والتهدئة (4-7-8)',
      name_en: 'Relaxing 4-7-8 Breath',
      description_ar: 'أربع ثوانٍ شهيق، سبع حبس، وثماني زفير بطيء. يساعد على التخلص من التوتر بعد جلسة مذاكرة مكثفة والتهيئة للراحة.',
      description_en: 'Extended 8s exhale activates parasympathetic calmness for unwinding after intense study.',
      category: 'deep_calm',
      default_cycles: 4,
      phases: [
        { name: 'inhale', label_ar: 'شهيق هادئ', label_en: 'Inhale Quietly', duration_sec: 4, haptic: [20] },
        { name: 'hold_in', label_ar: 'حبس النفس بلطف', label_en: 'Hold Gently', duration_sec: 7, haptic: [15, 60, 15] },
        { name: 'exhale', label_ar: 'زفير طويل وبطيء', label_en: 'Exhale Completely', duration_sec: 8, haptic: [40] }
      ]
    },
    {
      id: 'resonant_coherence',
      name_ar: 'تنفس التناغم والانسياب (5-5)',
      name_en: 'Resonant Coherence (5-5)',
      description_ar: 'خمس ثوانٍ شهيق وخمس ثوانٍ زفير متواصل. نمط انسيابي يضبط الإيقاع الذهني للدخول في حالة التدفق الدراسي (Flow State).',
      description_en: 'Smooth 5s inhale and exhale rhythm syncing mental pace for sustained deep flow.',
      category: 'flow_state',
      default_cycles: 6,
      phases: [
        { name: 'inhale', label_ar: 'شهيق انسيابي', label_en: 'Smooth Inhale', duration_sec: 5, haptic: [20] },
        { name: 'exhale', label_ar: 'زفير انسيابي', label_en: 'Smooth Exhale', duration_sec: 5, haptic: [30] }
      ]
    },
    {
      id: 'refresh_energizer',
      name_ar: 'تنفس التنشيط السريع (4-2-4)',
      name_en: 'Quick Energizer (4-2-4)',
      description_ar: 'شهيق لأربع ثوانٍ، حبس خفيف لثانيتين، ثم زفير لأربع ثوانٍ. ينشط اليقظة والانتباه عند الشعور بالنعاس أثناء الاستذكار.',
      description_en: 'Crisp rhythm to awaken alertness and break through afternoon study lethargy.',
      category: 'energize',
      default_cycles: 5,
      phases: [
        { name: 'inhale', label_ar: 'شهيق منعش', label_en: 'Brisk Inhale', duration_sec: 4, haptic: [25] },
        { name: 'hold_in', label_ar: 'حبس خاطف', label_en: 'Brief Hold', duration_sec: 2, haptic: [15] },
        { name: 'exhale', label_ar: 'زفير محكم', label_en: 'Firm Exhale', duration_sec: 4, haptic: [25] }
      ]
    }
  ];

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

  function getPatterns() {
    var list = clone(PATTERNS);
    for (var i = 0; i < list.length; i++) {
      list[i].cycle_duration_sec = getPatternCycleDuration(list[i]);
    }
    return list;
  }

  function getPatternById(id) {
    if (!id || typeof id !== 'string') {
      return clone(PATTERNS[0]);
    }
    for (var i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i].id === id) {
        var p = clone(PATTERNS[i]);
        p.cycle_duration_sec = getPatternCycleDuration(p);
        return p;
      }
    }
    var fallback = clone(PATTERNS[0]);
    fallback.cycle_duration_sec = getPatternCycleDuration(fallback);
    return fallback;
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
    var pattern = getPatternById(patternId);
    var cycles = (typeof targetCycles === 'number' && targetCycles > 0) ? Math.floor(targetCycles) : pattern.default_cycles;
    var hapticStrength = (options && options.hapticStrength) || 'medium';

    return {
      patternId: pattern.id,
      patternName_ar: pattern.name_ar,
      patternName_en: pattern.name_en,
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
    var pattern = getPatternById(session.patternId);
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
    var width = (options && options.width) || 360;
    var height = (options && options.height) || 360;
    var lang = (options && options.lang === 'ar') ? 'ar' : 'en';

    var pattern = getPatternById(session ? session.patternId : 'box_breathing');
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
    var phaseLabel = lang === 'ar' ? currentPhase.label_ar : currentPhase.label_en;
    var cycleLabel = lang === 'ar' ?
      ('دورة ' + cycleNum + ' من ' + targetCycles) :
      ('Cycle ' + cycleNum + ' of ' + targetCycles);

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
          (lang === 'ar' ? pattern.name_ar : pattern.name_en) +
        '</text>' +
        '<rect x="120" y="306" width="120" height="26" rx="13" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
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
