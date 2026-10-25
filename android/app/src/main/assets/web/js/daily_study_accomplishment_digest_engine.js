/**
 * DEEP FOCUS — Daily Study Accomplishment Digest Engine (M095)
 * File: android/app/src/main/assets/web/js/daily_study_accomplishment_digest_engine.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.DailyStudyAccomplishmentDigestEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function generateDailyDigest(sessions, targetDate, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var dateStr = targetDate || new Date().toISOString().split('T')[0];

    var daySessions = [];
    if (Array.isArray(sessions)) {
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (!s) continue;
        var sDate = s.date || (s.timestamp ? String(s.timestamp).split('T')[0] : '');
        if (sDate === dateStr) {
          daySessions.push(s);
        }
      }
    }

    var totalMinutes = 0;
    var uninterruptedCount = 0;
    var tagMinutesMap = {};
    var envCountMap = {};
    var hourDistribution = {};

    for (var j = 0; j < daySessions.length; j++) {
      var item = daySessions[j];
      var dur = (typeof item.duration_minutes === 'number' && !isNaN(item.duration_minutes)) ?
        Math.max(0, Math.round(item.duration_minutes)) : 25;

      totalMinutes += dur;
      if (!item.interrupted) {
        uninterruptedCount++;
      }

      var tag = item.tag || 'General';
      tagMinutesMap[tag] = (tagMinutesMap[tag] || 0) + dur;

      var env = item.sound_environment || 'none';
      if (env !== 'none') {
        envCountMap[env] = (envCountMap[env] || 0) + 1;
      }

      if (item.timestamp) {
        try {
          var dateObj = new Date(item.timestamp);
          if (!isNaN(dateObj.getTime())) {
            var hour = dateObj.getHours();
            hourDistribution[hour] = (hourDistribution[hour] || 0) + dur;
          }
        } catch (e) {
        }
      }
    }

    var topTag = 'General';
    var maxTagMins = 0;
    for (var t in tagMinutesMap) {
      if (tagMinutesMap[t] > maxTagMins) {
        maxTagMins = tagMinutesMap[t];
        topTag = t;
      }
    }

    var topEnv = 'none';
    var maxEnvCount = 0;
    for (var e in envCountMap) {
      if (envCountMap[e] > maxEnvCount) {
        maxEnvCount = envCountMap[e];
        topEnv = e;
      }
    }

    var peakHour = -1;
    var maxHourMins = 0;
    for (var h in hourDistribution) {
      if (hourDistribution[h] > maxHourMins) {
        maxHourMins = hourDistribution[h];
        peakHour = parseInt(h, 10);
      }
    }

    var sessionCount = daySessions.length;
    var completionRate = sessionCount > 0 ? Math.round((uninterruptedCount / sessionCount) * 100) : 0;

    return {
      date: dateStr,
      locale: locale,
      totalMinutes: totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      sessionCount: sessionCount,
      uninterruptedCount: uninterruptedCount,
      completionRate: completionRate,
      topTag: topTag,
      topTagMinutes: maxTagMins,
      topEnvironment: topEnv,
      peakHour: peakHour,
      breakdownByTag: tagMinutesMap,
      generatedTimestamp: new Date().toISOString()
    };
  }

  function renderDailyDigestSVG(digest, options) {
    var opts = options || {};
    var locale = opts.locale || (digest && digest.locale) || 'en';
    var width = opts.width || 420;
    var height = opts.height || 280;

    var totalMins = (digest && digest.totalMinutes) || 0;
    var sessions = (digest && digest.sessionCount) || 0;
    var rate = (digest && digest.completionRate) || 0;
    var topSubject = (digest && digest.topTag) || 'General';
    var dateStr = (digest && digest.date) || new Date().toISOString().split('T')[0];

    var headerTitle = translate('digest.header.title', locale) || 'DAILY FOCUS DIGEST';
    var focusMinsLabel = translate('digest.metric.minutes', locale) || 'MINUTES OF FOCUS';
    var sessionsLabel = translate('digest.metric.sessions', locale) || 'SESSIONS';
    var focusRateLabel = translate('digest.metric.rate', locale) || 'FOCUS RATE';
    var topSubjectLabel = translate('digest.metric.top_subject', locale) || 'TOP SUBJECT';

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<linearGradient id="digestCardBg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0F172A"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
          '<linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#F59E0B"/>' +
            '<stop offset="100%" stop-color="#FCD34D"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="20" fill="url(#digestCardBg)" stroke="#334155" stroke-width="1.5"/>' +
        '<rect x="24" y="22" width="48" height="4" rx="2" fill="url(#goldGradient)"/>' +
        '<rect x="286" y="18" width="110" height="22" rx="11" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<text x="341" y="33" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">' +
          dateStr +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="18" font-family="system-ui, sans-serif" font-weight="700" letter-spacing="0.5">' +
          headerTitle +
        '</text>' +
        '<text x="24" y="116" fill="url(#goldGradient)" font-size="48" font-family="system-ui, sans-serif" font-weight="800">' +
          totalMins +
        '</text>' +
        '<text x="130" y="108" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif" font-weight="600" letter-spacing="1">' +
          focusMinsLabel +
        '</text>' +
        '<line x1="24" y1="140" x2="396" y2="140" stroke="#1E293B" stroke-width="1"/>' +
        '<g transform="translate(24, 160)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' + sessionsLabel + '</text>' +
          '<text x="0" y="42" fill="#F8FAFC" font-size="22" font-family="system-ui, sans-serif" font-weight="700">' + sessions + '</text>' +
        '</g>' +
        '<g transform="translate(150, 160)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' + focusRateLabel + '</text>' +
          '<text x="0" y="42" fill="#10B981" font-size="22" font-family="system-ui, sans-serif" font-weight="700">' + rate + '%</text>' +
        '</g>' +
        '<g transform="translate(276, 160)">' +
          '<text x="0" y="14" fill="#94A3B8" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' + topSubjectLabel + '</text>' +
          '<text x="0" y="40" fill="#38BDF8" font-size="15" font-family="system-ui, sans-serif" font-weight="600">' +
            (topSubject.length > 14 ? topSubject.substring(0, 12) + '..' : topSubject) +
          '</text>' +
        '</g>' +
        '<rect x="24" y="232" width="372" height="28" rx="8" fill="#0A0F1D" stroke="#1E293B" stroke-width="1"/>' +
        '<circle cx="38" cy="246" r="4" fill="#10B981"/>' +
        '<text x="50" y="250" fill="#CBD5E1" font-size="10" font-family="system-ui, sans-serif" font-weight="500">' +
          'DEEP FOCUS • Mindful Study Progression' +
        '</text>' +
      '</svg>';

    return svg;
  }

  return {
    generateDailyDigest: generateDailyDigest,
    renderDailyDigestSVG: renderDailyDigestSVG
  };
}));
