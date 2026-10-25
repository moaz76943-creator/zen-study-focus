/**
 * DEEP FOCUS — Week-over-Week Study Comparison Engine (M102)
 * File: android/app/src/main/assets/web/js/week_over_week_comparison_engine.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.WeekOverWeekComparisonEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function formatDateOnly(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }

  function getComparativeWeekBounds(referenceDate) {
    var d;
    if (typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
      var parts = referenceDate.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    } else {
      d = referenceDate ? new Date(referenceDate) : new Date();
    }
    if (isNaN(d.getTime())) d = new Date();

    var day = d.getDay();
    var diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    var curMonday = new Date(d.getFullYear(), d.getMonth(), diffToMon, 0, 0, 0);
    var curSunday = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() + 6, 23, 59, 59, 999);

    var prevMonday = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() - 7, 0, 0, 0);
    var prevSunday = new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate() + 6, 23, 59, 59, 999);

    return {
      currentWeek: {
        startDate: formatDateOnly(curMonday),
        endDate: formatDateOnly(curSunday)
      },
      previousWeek: {
        startDate: formatDateOnly(prevMonday),
        endDate: formatDateOnly(prevSunday)
      }
    };
  }

  function aggregateWeekSessions(sessions, startDate, endDate) {
    var list = Array.isArray(sessions) ? sessions : [];
    var totalMins = 0;
    var sessionCount = 0;
    var uninterruptedCount = 0;
    var activeDaysMap = {};
    var subjectMinutes = {};

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s) continue;
      var sDate = s.date || (s.timestamp ? String(s.timestamp).split('T')[0] : '');

      if (sDate >= startDate && sDate <= endDate) {
        var dur = (typeof s.duration_minutes === 'number' && !isNaN(s.duration_minutes)) ? s.duration_minutes : 25;
        totalMins += dur;
        sessionCount++;
        if (!s.interrupted) uninterruptedCount++;
        activeDaysMap[sDate] = true;

        var tag = s.tag || 'General';
        subjectMinutes[tag] = (subjectMinutes[tag] || 0) + dur;
      }
    }

    var activeDays = Object.keys(activeDaysMap).length;
    var dailyAverageMins = activeDays > 0 ? Math.round(totalMins / activeDays) : 0;
    var completionRate = sessionCount > 0 ? Math.round((uninterruptedCount / sessionCount) * 100) : 0;

    return {
      totalMinutes: totalMins,
      totalHours: Math.round((totalMins / 60) * 10) / 10,
      sessionCount: sessionCount,
      activeDays: activeDays,
      dailyAverageMinutes: dailyAverageMins,
      completionRate: completionRate,
      subjectMinutes: subjectMinutes
    };
  }

  function compareWeeks(sessions, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var refDate = opts.referenceDate ? opts.referenceDate : new Date();
    var bounds = getComparativeWeekBounds(refDate);

    var current = aggregateWeekSessions(sessions, bounds.currentWeek.startDate, bounds.currentWeek.endDate);
    var previous = aggregateWeekSessions(sessions, bounds.previousWeek.startDate, bounds.previousWeek.endDate);

    var deltaMinutes = current.totalMinutes - previous.totalMinutes;
    var deltaHours = Math.round((deltaMinutes / 60) * 10) / 10;

    var percentageGrowth = 0;
    if (previous.totalMinutes > 0) {
      percentageGrowth = Math.round(((current.totalMinutes - previous.totalMinutes) / previous.totalMinutes) * 100);
    } else if (current.totalMinutes > 0) {
      percentageGrowth = 100;
    }

    var trend = 'consistent';
    if (percentageGrowth >= 5) {
      trend = 'growth';
    } else if (percentageGrowth <= -5) {
      trend = 'dip';
    }

    var allSubjects = {};
    for (var s1 in current.subjectMinutes) allSubjects[s1] = true;
    for (var s2 in previous.subjectMinutes) allSubjects[s2] = true;

    var subjectShifts = {};
    for (var sub in allSubjects) {
      var curSubMins = current.subjectMinutes[sub] || 0;
      var prevSubMins = previous.subjectMinutes[sub] || 0;
      subjectShifts[sub] = {
        currentMinutes: curSubMins,
        previousMinutes: prevSubMins,
        deltaMinutes: curSubMins - prevSubMins
      };
    }

    return {
      referenceDate: (typeof refDate === 'string') ? refDate : formatDateOnly(new Date()),
      bounds: bounds,
      currentWeek: current,
      previousWeek: previous,
      deltaMinutes: deltaMinutes,
      deltaHours: deltaHours,
      percentageGrowth: percentageGrowth,
      trend: trend,
      activeDaysDelta: current.activeDays - previous.activeDays,
      subjectShifts: subjectShifts,
      locale: locale
    };
  }

  function renderWoWComparisonSVG(comparison, options) {
    var opts = options || {};
    var locale = opts.locale || (comparison && comparison.locale) || 'en';
    var width = opts.width || 420;
    var height = opts.height || 270;

    var curHours = (comparison && comparison.currentWeek) ? comparison.currentWeek.totalHours : 0;
    var prevHours = (comparison && comparison.previousWeek) ? comparison.previousWeek.totalHours : 0;
    var growth = (comparison && comparison.percentageGrowth) !== undefined ? comparison.percentageGrowth : 0;
    var trend = (comparison && comparison.trend) || 'consistent';

    var headerTitle = translate('wow.header.title', locale) || 'WEEK-OVER-WEEK PROGRESS';
    var currentLabel = translate('wow.label.current_week', locale) || 'THIS WEEK';
    var previousLabel = translate('wow.label.previous_week', locale) || 'LAST WEEK';

    var trendLabel = '';
    var accentColor = '#10B981';
    var growthPrefix = growth > 0 ? '+' : '';

    if (trend === 'growth') {
      trendLabel = translate('wow.trend.growth', locale) || 'Positive Momentum';
      accentColor = '#10B981';
    } else if (trend === 'dip') {
      trendLabel = translate('wow.trend.dip', locale) || 'Focus Dip';
      accentColor = '#F59E0B';
    } else {
      trendLabel = translate('wow.trend.consistent', locale) || 'Steady Consistency';
      accentColor = '#38BDF8';
    }

    var maxBarHours = Math.max(1, Math.max(curHours, prevHours));
    var curBarWidth = Math.min(260, Math.max(8, Math.round((curHours / maxBarHours) * 260)));
    var prevBarWidth = Math.min(260, Math.max(8, Math.round((prevHours / maxBarHours) * 260)));

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<linearGradient id="wowCardBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
          '<linearGradient id="curBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="' + accentColor + '"/>' +
            '<stop offset="100%" stop-color="#38BDF8"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="20" fill="url(#wowCardBg)" stroke="#334155" stroke-width="1.5"/>' +
        '<rect x="24" y="22" width="48" height="4" rx="2" fill="' + accentColor + '"/>' +
        '<rect x="240" y="18" width="156" height="24" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<circle cx="254" cy="30" r="4" fill="' + accentColor + '"/>' +
        '<text x="264" y="34" fill="#E2E8F0" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' +
          trendLabel +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="17" font-family="system-ui, sans-serif" font-weight="700">' +
          headerTitle +
        '</text>' +
        '<text x="24" y="104" fill="' + accentColor + '" font-size="38" font-family="system-ui, sans-serif" font-weight="800">' +
          growthPrefix + growth + '%' +
        '</text>' +
        '<text x="140" y="98" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif" font-weight="600">' +
          (growth >= 0 ? 'INCREASE IN FOCUS HOURS' : 'CHANGE VS LAST WEEK') +
        '</text>' +
        '<g transform="translate(24, 130)">' +
          '<text x="0" y="11" fill="#E2E8F0" font-size="11" font-family="system-ui, sans-serif" font-weight="600">' + currentLabel + '</text>' +
          '<rect x="90" y="2" width="260" height="12" rx="6" fill="#1E293B"/>' +
          '<rect x="90" y="2" width="' + curBarWidth + '" height="12" rx="6" fill="url(#curBarGrad)"/>' +
          '<text x="360" y="12" fill="#F8FAFC" font-size="11" font-family="system-ui, sans-serif" font-weight="700">' + curHours + 'h</text>' +
        '</g>' +
        '<g transform="translate(24, 160)">' +
          '<text x="0" y="11" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif">' + previousLabel + '</text>' +
          '<rect x="90" y="2" width="260" height="12" rx="6" fill="#1E293B"/>' +
          '<rect x="90" y="2" width="' + prevBarWidth + '" height="12" rx="6" fill="#64748B"/>' +
          '<text x="360" y="12" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif">' + prevHours + 'h</text>' +
        '</g>' +
        '<rect x="24" y="196" width="372" height="48" rx="10" fill="#0A0F1D" stroke="#1E293B" stroke-width="1"/>' +
        '<text x="40" y="218" fill="#CBD5E1" font-size="11" font-family="system-ui, sans-serif">' +
          'Active Days: ' + ((comparison && comparison.currentWeek) ? comparison.currentWeek.activeDays : 0) + ' days this week vs ' +
          ((comparison && comparison.previousWeek) ? comparison.previousWeek.activeDays : 0) + ' days last week' +
        '</text>' +
        '<text x="40" y="234" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif">' +
          'Daily Average: ' + ((comparison && comparison.currentWeek) ? comparison.currentWeek.dailyAverageMinutes : 0) + ' min/day' +
        '</text>' +
      '</svg>';

    return svg;
  }

  return {
    getComparativeWeekBounds: getComparativeWeekBounds,
    aggregateWeekSessions: aggregateWeekSessions,
    compareWeeks: compareWeeks,
    renderWoWComparisonSVG: renderWoWComparisonSVG
  };
}));
