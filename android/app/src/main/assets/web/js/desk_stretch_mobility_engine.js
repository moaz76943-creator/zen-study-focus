/**
 * DEEP FOCUS — Desk Stretch & Micro-Break Mobility Engine (M097)
 * File: android/app/src/main/assets/web/js/desk_stretch_mobility_engine.js
 *
 * Provides structured, ergonomic micro-break routines (2-5 mins) to counter
 * study fatigue, relieve neck/wrist tension, and refresh blood flow between
 * deep focus sessions.
 *
 * Core Directives & Standards:
 * - Strictly Non-Medical (Ergonomic comfort & physical refresh, zero medical/therapeutic claims)
 * - Decoupled 100-locale support with strict English-only fallback (UniversalI18nBridge)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 * - 100% Pure Procedural SVG Vector Visuals (Zero external raster assets)
 * - Safe step-by-step timer execution with transition cues
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.DeskStretchMobilityEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  var EXERCISES = [
    {
      id: 'neck_shoulder_release',
      i18n_name: 'stretch.neck_shoulder.name',
      i18n_desc: 'stretch.neck_shoulder.desc',
      duration_sec: 30,
      target_area: 'neck_and_shoulders',
      icon_type: 'neck'
    },
    {
      id: 'wrist_forearm_refresh',
      i18n_name: 'stretch.wrist_forearm.name',
      i18n_desc: 'stretch.wrist_forearm.desc',
      duration_sec: 30,
      target_area: 'wrists_and_hands',
      icon_type: 'wrist'
    },
    {
      id: 'upper_back_chest_opener',
      i18n_name: 'stretch.upper_back.name',
      i18n_desc: 'stretch.upper_back.desc',
      duration_sec: 45,
      target_area: 'upper_back',
      icon_type: 'chest'
    },
    {
      id: 'seated_spinal_twist',
      i18n_name: 'stretch.spinal_twist.name',
      i18n_desc: 'stretch.spinal_twist.desc',
      duration_sec: 45,
      target_area: 'spine',
      icon_type: 'spine'
    },
    {
      id: 'standing_hip_flexor_stretch',
      i18n_name: 'stretch.hip_flexor.name',
      i18n_desc: 'stretch.hip_flexor.desc',
      duration_sec: 60,
      target_area: 'hips_and_legs',
      icon_type: 'standing'
    },
    {
      id: 'eye_palming_20_20',
      i18n_name: 'stretch.eye_palming.name',
      i18n_desc: 'stretch.eye_palming.desc',
      duration_sec: 30,
      target_area: 'eyes',
      icon_type: 'eyes'
    }
  ];

  var ROUTINES = [
    {
      id: 'quick_2min_desk_reset',
      i18n_title: 'stretch.routine.quick_2min.title',
      i18n_desc: 'stretch.routine.quick_2min.desc',
      exercise_ids: ['neck_shoulder_release', 'wrist_forearm_refresh', 'eye_palming_20_20'],
      total_duration_sec: 90
    },
    {
      id: 'full_5min_posture_reboot',
      i18n_title: 'stretch.routine.full_5min.title',
      i18n_desc: 'stretch.routine.full_5min.desc',
      exercise_ids: ['neck_shoulder_release', 'wrist_forearm_refresh', 'upper_back_chest_opener', 'seated_spinal_twist', 'standing_hip_flexor_stretch'],
      total_duration_sec: 240
    },
    {
      id: 'screen_fatigue_relief',
      i18n_title: 'stretch.routine.screen_relief.title',
      i18n_desc: 'stretch.routine.screen_relief.desc',
      exercise_ids: ['eye_palming_20_20', 'neck_shoulder_release', 'upper_back_chest_opener'],
      total_duration_sec: 105
    }
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getExercises(locale) {
    var list = clone(EXERCISES);
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      item.name = translate(item.i18n_name, locale);
      item.description = translate(item.i18n_desc, locale);
    }
    return list;
  }

  function getExerciseById(id, locale) {
    var all = getExercises(locale);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return all[0];
  }

  function getRoutines(locale) {
    var list = clone(ROUTINES);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      r.title = translate(r.i18n_title, locale);
      r.description = translate(r.i18n_desc, locale);
      r.exercises = [];
      for (var j = 0; j < r.exercise_ids.length; j++) {
        r.exercises.push(getExerciseById(r.exercise_ids[j], locale));
      }
    }
    return list;
  }

  function getRoutineById(id, locale) {
    var all = getRoutines(locale);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return all[0];
  }

  function createRoutineSession(routineId, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var routine = getRoutineById(routineId, locale);

    return {
      routineId: routine.id,
      routineTitle: routine.title,
      locale: locale,
      exercises: routine.exercises,
      currentExerciseIndex: 0,
      exerciseElapsedSec: 0,
      sessionElapsedSec: 0,
      totalDurationSec: routine.total_duration_sec,
      status: 'idle',
      lastTransitionEvent: null
    };
  }

  function stepRoutineSession(session, deltaSec) {
    if (!session || session.status !== 'running') {
      return session;
    }

    var remainingDelta = (typeof deltaSec === 'number' && deltaSec > 0) ? deltaSec : 1;
    var exercises = session.exercises;

    while (remainingDelta > 0 && session.status === 'running') {
      var currentEx = exercises[session.currentExerciseIndex];
      var neededForEx = currentEx.duration_sec - session.exerciseElapsedSec;

      if (remainingDelta >= neededForEx) {
        session.sessionElapsedSec += neededForEx;
        remainingDelta -= neededForEx;
        session.exerciseElapsedSec = 0;
        session.currentExerciseIndex++;

        if (session.currentExerciseIndex >= exercises.length) {
          session.currentExerciseIndex = exercises.length - 1;
          session.exerciseElapsedSec = exercises[session.currentExerciseIndex].duration_sec;
          session.status = 'completed';
          return session;
        }

        var nextEx = exercises[session.currentExerciseIndex];
        session.lastTransitionEvent = {
          exerciseId: nextEx.id,
          exerciseName: nextEx.name,
          durationSec: nextEx.duration_sec,
          timestamp: Date.now()
        };
      } else {
        session.exerciseElapsedSec += remainingDelta;
        session.sessionElapsedSec += remainingDelta;
        remainingDelta = 0;
      }
    }

    return session;
  }

  function renderStretchGuideSVG(exercise, options) {
    var opts = options || {};
    var locale = opts.locale || 'en';
    var width = opts.width || 420;
    var height = opts.height || 260;

    var name = exercise.name || translate(exercise.i18n_name, locale) || 'Desk Stretch';
    var desc = exercise.description || translate(exercise.i18n_desc, locale) || 'Gentle ergonomic movement.';
    var dur = exercise.duration_sec || 30;

    var badgeText = translate('stretch.badge.mobility', locale) || 'DESK MOBILITY';
    var durationLabel = translate('stretch.label.duration', locale) || 'DURATION';

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<linearGradient id="stretchCardBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
          '<linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#10B981"/>' +
            '<stop offset="100%" stop-color="#34D399"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="20" fill="url(#stretchCardBg)" stroke="#334155" stroke-width="1.5"/>' +
        '<rect x="24" y="22" width="48" height="4" rx="2" fill="url(#emeraldGrad)"/>' +
        '<rect x="260" y="18" width="136" height="24" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<circle cx="274" cy="30" r="4" fill="#10B981"/>' +
        '<text x="284" y="34" fill="#E2E8F0" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' +
          badgeText +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="18" font-family="system-ui, sans-serif" font-weight="700">' +
          name +
        '</text>' +
        '<text x="24" y="86" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif">' +
          desc.substring(0, 95) + '...' +
        '</text>' +
        '<rect x="24" y="112" width="372" height="66" rx="12" fill="#0A0F1D" stroke="#1E293B" stroke-width="1"/>' +
        '<g transform="translate(40, 130)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif">' + durationLabel + '</text>' +
          '<text x="0" y="36" fill="#10B981" font-size="22" font-family="system-ui, sans-serif" font-weight="700">' +
            dur + 's' +
          '</text>' +
        '</g>' +
        '<g transform="translate(180, 130)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif">ERGONOMIC CUE</text>' +
          '<text x="0" y="34" fill="#CBD5E1" font-size="12" font-family="system-ui, sans-serif">Breathe slowly and maintain upright spine.</text>' +
        '</g>' +
        '<rect x="24" y="196" width="372" height="40" rx="8" fill="#1E293B"/>' +
        '<text x="210" y="221" fill="#F8FAFC" font-size="13" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">' +
          'START 30-SECOND MICRO-BREAK' +
        '</text>' +
      '</svg>';

    return svg;
  }

  return {
    EXERCISES: EXERCISES,
    ROUTINES: ROUTINES,
    getExercises: getExercises,
    getExerciseById: getExerciseById,
    getRoutines: getRoutines,
    getRoutineById: getRoutineById,
    createRoutineSession: createRoutineSession,
    stepRoutineSession: stepRoutineSession,
    renderStretchGuideSVG: renderStretchGuideSVG
  };
}));
