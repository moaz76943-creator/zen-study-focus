/**
 * DEEP FOCUS — Weekly Study Goals & Target Hours Engine (M096)
 * File: android/app/src/main/assets/web/js/weekly_study_goals_engine.js
 *
 * Tracks weekly study hour commitments, calculates pacing metrics (Run Rate,
 * Ahead/Behind schedule), tracks per-subject milestone goals, and generates
 * a standalone procedural SVG weekly progress gauge.
 *
 * Core Directives & Standards:
 * - Decoupled 100-locale support with strict English-only fallback (UniversalI18nBridge)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 * - 100% Pure Procedural SVG Vector Visuals (Zero external raster assets)
 * - v21 Data Fortress schema adherence
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.WeeklyStudyGoalsEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  var DEFAULT_TARGET_HOURS = 15;

  function getWeekBounds(referenceDate) {
    var d = referenceDate ? new Date(referenceDate) : new Date();
    if (isNaN(d.getTime())) d = new Date();

    var day = d.getDay();
    var diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(d.setDate(diffToMon));
    monday.setHours(0, 0, 0, 0);

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      startDateStr: monday.toISOString().split('T')[0],
      endDateStr: sunday.toISOString().split('T')[0],
      startMillis: monday.getTime(),
      endMillis: sunday.getTime()
    };
  }

  function evaluateWeeklyGoal(sessions, goalConfig, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var refDate = opts.referenceDate ? new Date(opts.referenceDate) : new Date();
    var bounds = getWeekBounds(refDate);

    var targetHours = (goalConfig && typeof goalConfig.targetHours === 'number' && goalConfig.targetHours > 0) ?
      goalConfig.targetHours : DEFAULT_TARGET_HOURS;
    var targetMinutes = Math.round(targetHours * 60);

    var subjectGoals = (goalConfig && typeof goalConfig.subjectGoals === 'object' && goalConfig.subjectGoals !== null) ?
      goalConfig.subjectGoals : {};

    var completedMinutes = 0;
    var subjectActualMinutes = {};

    if (Array.isArray(sessions)) {
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (!s) continue;
        var sDate = s.date || (s.timestamp ? String(s.timestamp).split('T')[0] : '');

        if (sDate >= bounds.startDateStr && sDate <= bounds.endDateStr) {
          var dur = (typeof s.duration_minutes === 'number' && !isNaN(s.duration_minutes)) ?
            Math.max(0, Math.round(s.duration_minutes)) : 25;

          completedMinutes += dur;
          var tag = s.tag || 'General';
          subjectActualMinutes[tag] = (subjectActualMinutes[tag] || 0) + dur;
        }
      }
    }

    var progressPercent = targetMinutes > 0 ?
      Math.min(100, Math.round((completedMinutes / targetMinutes) * 100)) : 0;
    var rawPercent = targetMinutes > 0 ?
      Math.round((completedMinutes / targetMinutes) * 100) : 0;

    var remainingMinutes = Math.max(0, targetMinutes - completedMinutes);
    var completedHours = Math.round((completedMinutes / 60) * 10) / 10;
    var remainingHours = Math.round((remainingMinutes / 60) * 10) / 10;

    var dayOfWeek = refDate.getDay();
    var currentIsoDay = (dayOfWeek === 0) ? 7 : dayOfWeek;
    var remainingDays = Math.max(1, 7 - currentIsoDay + 1);

    var dailyRunRateNeededMins = Math.round(remainingMinutes / remainingDays);
    var expectedMinsAtCurrentDay = Math.round((targetMinutes / 7) * currentIsoDay);

    var paceStatus = 'on_track';
    if (completedMinutes >= expectedMinsAtCurrentDay + 30) {
      paceStatus = 'ahead';
    } else if (completedMinutes < expectedMinsAtCurrentDay - 60 && completedMinutes < targetMinutes) {
      paceStatus = 'behind';
    }

    var subjectBreakdown = {};
    for (var sub in subjectGoals) {
      var subTargetMins = Math.round(subjectGoals[sub] * 60);
      var subActualMins = subjectActualMinutes[sub] || 0;
      subjectBreakdown[sub] = {
        targetMinutes: subTargetMins,
        targetHours: subjectGoals[sub],
        actualMinutes: subActualMins,
        actualHours: Math.round((subActualMins / 60) * 10) / 10,
        percent: subTargetMins > 0 ? Math.min(100, Math.round((subActualMins / subTargetMins) * 100)) : 100
      };
    }

    return {
      weekStart: bounds.startDateStr,
      weekEnd: bounds.endDateStr,
      locale: locale,
      targetHours: targetHours,
      targetMinutes: targetMinutes,
      completedMinutes: completedMinutes,
      completedHours: completedHours,
      remainingMinutes: remainingMinutes,
      remainingHours: remainingHours,
      progressPercent: progressPercent,
      rawPercent: rawPercent,
      currentDayOfSeven: currentIsoDay,
      remainingDays: remainingDays,
      dailyRunRateNeededMins: dailyRunRateNeededMins,
      paceStatus: paceStatus,
      subjectBreakdown: subjectBreakdown
    };
  }

  function renderWeeklyGoalProgressSVG(progress, options) {
    var opts = options || {};
    var locale = opts.locale || (progress && progress.locale) || 'en';
    var width = opts.width || 420;
    var height = opts.height || 260;

    var completedHrs = (progress && progress.completedHours) !== undefined ? progress.completedHours : 0;
    var targetHrs = (progress && progress.targetHours) !== undefined ? progress.targetHours : 15;
    var percent = (progress && progress.progressPercent) !== undefined ? progress.progressPercent : 0;
    var pace = (progress && progress.paceStatus) || 'on_track';
    var remainingMins = (progress && progress.remainingMinutes) !== undefined ? progress.remainingMinutes : 0;
    var runRate = (progress && progress.dailyRunRateNeededMins) !== undefined ? progress.dailyRunRateNeededMins : 0;

    var headerTitle = translate('goals.header.weekly', locale) || 'WEEKLY STUDY GOAL';
    var completedLabel = translate('goals.label.completed', locale) || 'HOURS COMPLETED';
    var runRateLabel = translate('goals.label.run_rate', locale) || 'DAILY RUN RATE NEEDED';

    var paceLabel = '';
    var paceColor = '#10B981';
    if (pace === 'ahead') {
      paceLabel = translate('goals.pace.ahead', locale) || 'Ahead of Schedule';
      paceColor = '#38BDF8';
    } else if (pace === 'behind') {
      paceLabel = translate('goals.pace.behind', locale) || 'Catch Up Needed';
      paceColor = '#F59E0B';
    } else {
      paceLabel = translate('goals.pace.on_track', locale) || 'On Track';
      paceColor = '#10B981';
    }

    var barWidth = Math.min(372, Math.max(0, Math.round((percent / 100) * 372)));

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<linearGradient id="goalCardBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
          '<linearGradient id="progressBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="' + paceColor + '"/>' +
            '<stop offset="100%" stop-color="#38BDF8"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="20" fill="url(#goalCardBg)" stroke="#334155" stroke-width="1.5"/>' +
        '<rect x="24" y="22" width="48" height="4" rx="2" fill="' + paceColor + '"/>' +
        '<rect x="250" y="18" width="146" height="24" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<circle cx="264" cy="30" r="4" fill="' + paceColor + '"/>' +
        '<text x="274" y="34" fill="#E2E8F0" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' +
          paceLabel +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="18" font-family="system-ui, sans-serif" font-weight="700">' +
          headerTitle +
        '</text>' +
        '<text x="24" y="112" fill="#F8FAFC" font-size="44" font-family="system-ui, sans-serif" font-weight="800">' +
          completedHrs +
        '</text>' +
        '<text x="120" y="98" fill="#94A3B8" font-size="18" font-family="system-ui, sans-serif" font-weight="600">' +
          '/ ' + targetHrs + ' hrs' +
        '</text>' +
        '<text x="120" y="116" fill="' + paceColor + '" font-size="13" font-family="system-ui, sans-serif" font-weight="700">' +
          percent + '% ' + completedLabel +
        '</text>' +
        '<rect x="24" y="136" width="372" height="12" rx="6" fill="#1E293B"/>' +
        '<rect x="24" y="136" width="' + barWidth + '" height="12" rx="6" fill="url(#progressBarGrad)"/>' +
        '<rect x="24" y="166" width="372" height="68" rx="10" fill="#0A0F1D" stroke="#1E293B" stroke-width="1"/>' +
        '<g transform="translate(40, 184)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif">' + runRateLabel + '</text>' +
          '<text x="0" y="36" fill="#F8FAFC" font-size="18" font-family="system-ui, sans-serif" font-weight="700">' +
            runRate + ' min/day' +
          '</text>' +
        '</g>' +
        '<g transform="translate(240, 184)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif">REMAINING</text>' +
          '<text x="0" y="36" fill="#38BDF8" font-size="18" font-family="system-ui, sans-serif" font-weight="700">' +
            remainingMins + ' mins' +
          '</text>' +
        '</g>' +
      '</svg>';

    return svg;
  }

  return {
    DEFAULT_TARGET_HOURS: DEFAULT_TARGET_HOURS,
    getWeekBounds: getWeekBounds,
    evaluateWeeklyGoal: evaluateWeeklyGoal,
    renderWeeklyGoalProgressSVG: renderWeeklyGoalProgressSVG
  };
}));
