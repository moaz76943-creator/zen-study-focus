/**
 * DEEP FOCUS — Desk Stretch Audio-Haptic Sync Engine
 * Cycle: CYCLE-117 (Mission #117)
 * Architecture: v21 Data Fortress Safe, Sensory Posture Mobility Pacer
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Ergonomic Desk Posture Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DeskStretchSyncEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STRETCH_EXERCISES = [
    { id: 'NECK_SIDE_TILT', defaultDurationSec: 20, isBilateral: true },
    { id: 'SHOULDER_ROLLS', defaultDurationSec: 15, isBilateral: false },
    { id: 'WRIST_RELEASE', defaultDurationSec: 15, isBilateral: true },
    { id: 'UPPER_BACK_OPENER', defaultDurationSec: 25, isBilateral: false },
    { id: 'SEATED_TORSO_TWIST', defaultDurationSec: 20, isBilateral: true }
  ];

  const PHASES = {
    PREPARE: 'PREPARE',
    STRETCH: 'STRETCH',
    HOLD: 'HOLD',
    RELEASE: 'RELEASE',
    SWITCH_SIDE: 'SWITCH_SIDE',
    COMPLETE: 'COMPLETE'
  };

  const SENSORY_PATTERNS = {
    [PHASES.PREPARE]: { vibration: [60], chimeToneHz: 440 },
    [PHASES.STRETCH]: { vibration: [80, 60, 80], chimeToneHz: 528 },
    [PHASES.HOLD]: { vibration: [30], chimeToneHz: 330 },
    [PHASES.RELEASE]: { vibration: [100, 80, 140], chimeToneHz: 260 },
    [PHASES.SWITCH_SIDE]: { vibration: [70, 70], chimeToneHz: 494 },
    [PHASES.COMPLETE]: { vibration: [120, 80, 120, 80, 240], chimeToneHz: 660 }
  };

  const I18N_STRINGS = {
    en: {
      exercise_neck: "Gentle Neck Side Tilt",
      exercise_shoulders: "Shoulder Blade Rolls",
      exercise_wrist: "Wrist & Forearm Release",
      exercise_back: "Chest & Upper Back Opener",
      exercise_twist: "Seated Torso Spinal Decompression",
      phase_prepare: "Get in position...",
      phase_stretch: "Gently ease into the stretch.",
      phase_hold: "Hold and breathe calmly.",
      phase_release: "Slowly release.",
      phase_switch: "Switch to the other side.",
      phase_complete: "Stretch routine complete. Ready for deep focus!"
    },
    ar: {
      exercise_neck: "إمالة الرقبة الجانبية بلطف",
      exercise_shoulders: "تدوير الكتفين للخلف",
      exercise_wrist: "إراحة المعصم والساعد",
      exercise_back: "فتح الصدر وأعلى الظهر",
      exercise_twist: "التواء الجذع الهادئ لإراحة الظهر",
      phase_prepare: "استعد للجلسة السليمة...",
      phase_stretch: "ابدأ التمدد بلطف دون إجهاد.",
      phase_hold: "ثبّت الوضعية وتنفّس بهدوء.",
      phase_release: "أرخِ العضلات ببطء.",
      phase_switch: "انتقل إلى الجهة الأخرى.",
      phase_complete: "اكتمل تمرين التمدد. ذهنك مستعد للتركيز!"
    }
  };

  function sanitizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    const clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') {
      return 'en';
    }
    return clean;
  }

  function toWesternDigits(num, decimals = 0) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function getExercises() {
    return STRETCH_EXERCISES.slice();
  }

  function getPhaseCue(phase, config = {}) {
    const p = PHASES[phase] || PHASES.PREPARE;
    const base = SENSORY_PATTERNS[p];
    const hapticsEnabled = config.hapticsEnabled !== false;
    const soundEnabled = config.soundEnabled !== false;

    return {
      phase: p,
      vibrationPattern: hapticsEnabled ? base.vibration.slice() : [],
      chimeFrequencyHz: soundEnabled ? base.chimeToneHz : null,
      timestamp: Date.now()
    };
  }

  function buildExerciseTimeline(exerciseId, customDurationSec = null) {
    const ex = STRETCH_EXERCISES.find(e => e.id === exerciseId) || STRETCH_EXERCISES[0];
    const duration = Math.max(10, parseInt(customDurationSec, 10) || ex.defaultDurationSec);

    const timeline = [];
    timeline.push({ phase: PHASES.PREPARE, durationSec: 3 });
    timeline.push({ phase: PHASES.STRETCH, durationSec: 2 });
    timeline.push({ phase: PHASES.HOLD, durationSec: duration });
    timeline.push({ phase: PHASES.RELEASE, durationSec: 3 });

    if (ex.isBilateral) {
      timeline.push({ phase: PHASES.SWITCH_SIDE, durationSec: 3 });
      timeline.push({ phase: PHASES.STRETCH, durationSec: 2 });
      timeline.push({ phase: PHASES.HOLD, durationSec: duration });
      timeline.push({ phase: PHASES.RELEASE, durationSec: 3 });
    }

    timeline.push({ phase: PHASES.COMPLETE, durationSec: 0 });

    const totalDurationSec = timeline.reduce((acc, step) => acc + step.durationSec, 0);

    return {
      exerciseId: ex.id,
      isBilateral: ex.isBilateral,
      stepCount: timeline.length,
      totalDurationSec,
      totalDurationFormatted: `${toWesternDigits(totalDurationSec)}s`,
      timeline
    };
  }

  return {
    STRETCH_EXERCISES,
    PHASES,
    SENSORY_PATTERNS,
    getExercises,
    getPhaseCue,
    buildExerciseTimeline,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
