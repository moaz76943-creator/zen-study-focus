/**
 * DEEP FOCUS — Intrinsic Milestone & Long-Term Progression Engine
 * Mission #047: Non-manipulative cumulative focus milestones,
 * hours mastery tracking, and Western digits progress badges.
 */
(function (global) {
  'use strict';

  var MILESTONES = [
    { id: "first_session", titleAr: "بداية الرحلة", reqSessions: 1, reqMinutes: 0 },
    { id: "ten_hours", titleAr: "10 ساعات من التركيز", reqSessions: 0, reqMinutes: 600 },
    { id: "twenty_five_sessions", titleAr: "25 جلسة مكتملة", reqSessions: 25, reqMinutes: 0 },
    { id: "fifty_hours", titleAr: "50 ساعة من الإتقان", reqSessions: 0, reqMinutes: 3000 },
    { id: "centurion_sessions", titleAr: "مئوية الجلسات (100)", reqSessions: 100, reqMinutes: 0 }
  ];

  function evaluateProgression(sessions) {
    var list = Array.isArray(sessions) ? sessions : [];
    var totalMinutes = 0;
    var validSessions = 0;

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || typeof s !== 'object') continue;
      var mins = Number(s.durationMinutes) || 0;
      if (mins > 0) {
        totalMinutes += mins;
        validSessions++;
      }
    }

    var unlocked = [];
    var pending = [];

    for (var m = 0; m < MILESTONES.length; m++) {
      var ms = MILESTONES[m];
      var metSessions = ms.reqSessions > 0 ? (validSessions >= ms.reqSessions) : true;
      var metMinutes = ms.reqMinutes > 0 ? (totalMinutes >= ms.reqMinutes) : true;

      if (metSessions && metMinutes) {
        unlocked.push(ms);
      } else {
        var progressRatio = 0;
        if (ms.reqMinutes > 0) {
          progressRatio = Math.min(0.99, totalMinutes / ms.reqMinutes);
        } else if (ms.reqSessions > 0) {
          progressRatio = Math.min(0.99, validSessions / ms.reqSessions);
        }
        pending.push({
          id: ms.id,
          titleAr: ms.titleAr,
          progressPercent: Math.round(progressRatio * 100)
        });
      }
    }

    return {
      totalSessions: validSessions,
      totalMinutes: totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      unlockedCount: unlocked.length,
      unlockedMilestones: unlocked,
      nextMilestone: pending.length > 0 ? pending[0] : null
    };
  }

  var engine = {
    MILESTONES: MILESTONES,
    evaluateProgression: evaluateProgression
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.MilestoneProgressionEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
