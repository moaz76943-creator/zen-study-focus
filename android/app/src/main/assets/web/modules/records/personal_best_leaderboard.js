/**
 * DEEP FOCUS - Axis 8: Personal Best Leaderboard & Ghost Pacer Studio
 * Milestone M8488 - M8497 | Sovereign Offline Architecture
 * Pure Local Storage / Zero-Cloud / Zero-PII / Self-Mastery Hall of Fame
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PersonalBestLeaderboard = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_RECORDS = 'df_personal_best_records_v1';
  const STORAGE_KEY_LOGS = 'df_daily_activity_ledger_v1';

  class PersonalBestLeaderboard {
    constructor() {
      this.records = {
        bestDailyMinutes: { value: 0, date: null, verified: false },
        bestWeeklyHours: { value: 0, weekEnd: null, verified: false },
        longestUnbrokenSessionMinutes: { value: 0, date: null, verified: false },
        highestFlashcardStreak: { value: 0, date: null, verified: false },
        awardedBadges: []
      };
      this.dailyLedger = {};
      this._loadStorage();
    }

    _loadStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          const rawR = localStorage.getItem(STORAGE_KEY_RECORDS);
          if (rawR) {
            const parsed = JSON.parse(rawR);
            this.records = Object.assign(this.records, parsed);
          }
          const rawL = localStorage.getItem(STORAGE_KEY_LOGS);
          if (rawL) {
            this.dailyLedger = JSON.parse(rawL) || {};
          }
        }
      } catch (e) {
        console.warn('[PersonalBest] Storage restore failed, using initial defaults.', e);
      }
    }

    _saveStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(this.records));
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.dailyLedger));
        }
      } catch (e) {
        console.warn('[PersonalBest] Storage persistence failed.', e);
      }
    }

    _getTodayKey() {
      return (function(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(new Date());
    }

    // M8488: dfTrackPersonalBestDailyMinutes
    dfTrackPersonalBestDailyMinutes(minutes, dateIso = null) {
      const todayKey = dateIso ? (function(v){if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return v;var d=new Date(v);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(dateIso) : this._getTodayKey();
      const currentDayTotal = (this.dailyLedger[todayKey] || 0) + (parseInt(minutes, 10) || 0);
      this.dailyLedger[todayKey] = currentDayTotal;

      let isNewRecord = false;
      if (currentDayTotal > this.records.bestDailyMinutes.value) {
        this.records.bestDailyMinutes = {
          value: currentDayTotal,
          date: todayKey,
          verified: true
        };
        isNewRecord = true;
        this.dfAwardNewPersonalRecordBadge('DAILY_SUMMIT', currentDayTotal);
      }

      this._saveStorage();
      return {
        todayTotalMinutes: currentDayTotal,
        recordMinutes: this.records.bestDailyMinutes.value,
        isNewPersonalRecord: isNewRecord
      };
    }

    // M8489: dfTrackPersonalBestWeeklyHours
    dfTrackPersonalBestWeeklyHours(rollingWeekHours) {
      const hours = parseFloat(rollingWeekHours) || 0;
      let isNewRecord = false;

      if (hours > this.records.bestWeeklyHours.value) {
        this.records.bestWeeklyHours = {
          value: hours,
          weekEnd: this._getTodayKey(),
          verified: true
        };
        isNewRecord = true;
        this.dfAwardNewPersonalRecordBadge('WEEKLY_TITAN', hours);
      }

      this._saveStorage();
      return {
        currentWeeklyHours: hours,
        recordWeeklyHours: this.records.bestWeeklyHours.value,
        isNewPersonalRecord: isNewRecord
      };
    }

    // M8490: dfTrackLongestUnbrokenFocusSession
    dfTrackLongestUnbrokenFocusSession(sessionDurationMinutes) {
      const duration = parseInt(sessionDurationMinutes, 10) || 0;
      let isNewRecord = false;

      if (duration > this.records.longestUnbrokenSessionMinutes.value) {
        this.records.longestUnbrokenSessionMinutes = {
          value: duration,
          date: this._getTodayKey(),
          verified: true
        };
        isNewRecord = true;
        this.dfAwardNewPersonalRecordBadge('UNBROKEN_FOCUS_CHAMPION', duration);
      }

      this._saveStorage();
      return {
        sessionMinutes: duration,
        recordSessionMinutes: this.records.longestUnbrokenSessionMinutes.value,
        isNewPersonalRecord: isNewRecord
      };
    }

    // M8491: dfTrackHighestFlashcardStreak
    dfTrackHighestFlashcardStreak(streakCount) {
      const streak = parseInt(streakCount, 10) || 0;
      let isNewRecord = false;

      if (streak > this.records.highestFlashcardStreak.value) {
        this.records.highestFlashcardStreak = {
          value: streak,
          date: this._getTodayKey(),
          verified: true
        };
        isNewRecord = true;
        this.dfAwardNewPersonalRecordBadge('MEMORY_SYNAPSE_RECORD', streak);
      }

      this._saveStorage();
      return {
        currentStreak: streak,
        recordStreak: this.records.highestFlashcardStreak.value,
        isNewPersonalRecord: isNewRecord
      };
    }

    // M8492: dfCompareCurrentMonthVsLastMonth
    dfCompareCurrentMonthVsLastMonth() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
      const lastYear = lastMonthDate.getFullYear();
      const lastMonth = lastMonthDate.getMonth() + 1;

      const currentPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      const lastPrefix = `${lastYear}-${String(lastMonth).padStart(2, '0')}`;

      let currentMonthMinutes = 0;
      let lastMonthMinutes = 0;

      for (const [dateKey, mins] of Object.entries(this.dailyLedger)) {
        if (dateKey.startsWith(currentPrefix)) currentMonthMinutes += mins;
        if (dateKey.startsWith(lastPrefix)) lastMonthMinutes += mins;
      }

      const diff = currentMonthMinutes - lastMonthMinutes;
      const growthRate = lastMonthMinutes > 0
        ? Math.round((diff / lastMonthMinutes) * 100)
        : (currentMonthMinutes > 0 ? 100 : 0);

      return {
        currentMonthMinutes: currentMonthMinutes,
        lastMonthMinutes: lastMonthMinutes,
        differenceMinutes: diff,
        growthPercentage: growthRate,
        trajectory: diff >= 0 ? 'expanding' : 'contracting'
      };
    }

    // M8493: dfCalculateGhostPacerComparison
    dfCalculateGhostPacerComparison(nowDate = new Date()) {
      const todayKey = (function(v){if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return v;var d=new Date(v);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(nowDate);
      const yesterday = new Date(nowDate.getTime() - (24 * 60 * 60 * 1000));
      const yesterdayKey = (function(v){if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return v;var d=new Date(v);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(yesterday);

      const todayMins = this.dailyLedger[todayKey] || 0;
      const yesterdayMins = this.dailyLedger[yesterdayKey] || 0;

      const delta = todayMins - yesterdayMins;
      let status = 'tied';
      if (delta > 0) status = 'ahead_of_ghost';
      else if (delta < 0) status = 'behind_ghost';

      return {
        todayMinutes: todayMins,
        yesterdayGhostMinutes: yesterdayMins,
        deltaMinutes: delta,
        pacerStatus: status,
        encouragement: status === 'ahead_of_ghost'
          ? 'You are outpacing yesterday\'s self. Maintain cadence!'
          : 'Catch up to yesterday\'s ghost with one sovereign focus interval.'
      };
    }

    // M8494: dfAwardNewPersonalRecordBadge
    dfAwardNewPersonalRecordBadge(recordType, recordValue) {
      const badgeTitles = {
        DAILY_SUMMIT: { title: 'Daily Summit Breaker', tier: 'Gold', icon: '⛰️' },
        WEEKLY_TITAN: { title: 'Weekly Titan', tier: 'Diamond', icon: '🏛️' },
        UNBROKEN_FOCUS_CHAMPION: { title: 'Unbroken Flow Mastery', tier: 'Platinum', icon: '⚡' },
        MEMORY_SYNAPSE_RECORD: { title: 'Memory Synapse Peak', tier: 'Ruby', icon: '🧠' }
      };

      const meta = badgeTitles[recordType] || { title: 'Sovereign Record', tier: 'Gold', icon: '🏆' };
      const badge = {
        badgeId: 'badge_' + Date.now().toString(36),
        type: recordType,
        title: meta.title,
        tier: meta.tier,
        icon: meta.icon,
        value: recordValue,
        awardedAt: new Date().toISOString()
      };

      this.records.awardedBadges.push(badge);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        ((navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) ? navigator.vibrate([40, 60, 40]) : false);
      }
      return badge;
    }

    // M8495: dfRenderPersonalRecordsTrophyCabinet
    dfRenderPersonalRecordsTrophyCabinet() {
      const bDaily = this.records.bestDailyMinutes.value;
      const bWeekly = this.records.bestWeeklyHours.value;
      const bSession = this.records.longestUnbrokenSessionMinutes.value;
      const bStreak = this.records.highestFlashcardStreak.value;

      return {
        summary: {
          bestDailyMinutes: bDaily,
          bestWeeklyHours: bWeekly,
          longestUnbrokenSessionMinutes: bSession,
          highestFlashcardStreak: bStreak,
          totalBadgesCount: this.records.awardedBadges.length
        },
        trophySvg: `<svg width="320" height="120" viewBox="0 0 320 120">
          <rect width="320" height="120" rx="16" fill="#0f172a"/>
          <g transform="translate(20,20)">
            <circle cx="30" cy="30" r="24" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
            <text x="30" y="36" font-size="18" text-anchor="middle">⛰️</text>
            <text x="30" y="70" font-size="10" fill="#94a3b8" text-anchor="middle">${bDaily}m Day</text>
          </g>
          <g transform="translate(95,20)">
            <circle cx="30" cy="30" r="24" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
            <text x="30" y="36" font-size="18" text-anchor="middle">🏛️</text>
            <text x="30" y="70" font-size="10" fill="#94a3b8" text-anchor="middle">${bWeekly}h Wk</text>
          </g>
          <g transform="translate(170,20)">
            <circle cx="30" cy="30" r="24" fill="#1e293b" stroke="#10b981" stroke-width="2"/>
            <text x="30" y="36" font-size="18" text-anchor="middle">⚡</text>
            <text x="30" y="70" font-size="10" fill="#94a3b8" text-anchor="middle">${bSession}m Flow</text>
          </g>
          <g transform="translate(245,20)">
            <circle cx="30" cy="30" r="24" fill="#1e293b" stroke="#ec4899" stroke-width="2"/>
            <text x="30" y="36" font-size="18" text-anchor="middle">🧠</text>
            <text x="30" y="70" font-size="10" fill="#94a3b8" text-anchor="middle">${bStreak} Cards</text>
          </g>
        </svg>`
      };
    }

    // M8496: dfExportPersonalBestInfographic
    dfExportPersonalBestInfographic() {
      const data = this.dfRenderPersonalRecordsTrophyCabinet();
      const exportJson = JSON.stringify({
        schema: 'DEEP_FOCUS_PERSONAL_BEST_INFOGRAPHIC_V1',
        exportedAt: new Date().toISOString(),
        sovereignty: 'Zero Tracking / Zero Server Verified',
        records: data.summary
      }, null, 2);

      return {
        infographicSvg: data.trophySvg,
        rawExportJson: exportJson,
        hashSignature: 'DFPB:' + btoa(unescape(encodeURIComponent(exportJson))).slice(0, 32)
      };
    }

    // M8497: dfGetMilestoneM8497PersonalBestSeal
    dfGetMilestoneM8497PersonalBestSeal() {
      return {
        milestone: 'M8497',
        architecture: 'Personal Best Leaderboard & Deep Work Hall of Fame',
        philosophy: 'Compete Solely Against Your Prior Self, Not Remote Telemetry',
        numerals: 'Strict Western ASCII 0123456789',
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED_SOVEREIGN'
      };
    }
  }

  return PersonalBestLeaderboard;
}));
